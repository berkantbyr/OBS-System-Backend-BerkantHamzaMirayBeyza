const db = require('../models');
const { Wallet, Transaction, User } = db;
const paymentService = require('./paymentService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * WalletService - Handles wallet operations
 */
class WalletService {
  /**
   * Get or create wallet for user
   * @param {string} userId - User ID
   * @param {Object} transaction - Sequelize transaction (optional)
   * @returns {Object} - Wallet object
   */
  async getWalletByUserId(userId, transaction = null) {
    let wallet = await Wallet.findOne({
      where: { user_id: userId },
      transaction,
    });

    if (!wallet) {
      wallet = await Wallet.create(
        {
          user_id: userId,
          balance: 0,
          currency: 'TRY',
          is_active: true,
        },
        { transaction }
      );
      logger.info(`Wallet created for user: ${userId}`);
    }

    return wallet;
  }

  /**
   * Get wallet balance
   * @param {string} userId - User ID
   * @returns {Object} - Wallet balance info
   */
  async getBalance(userId) {
    const wallet = await this.getWalletByUserId(userId);

    return {
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      is_active: wallet.is_active,
    };
  }

  /**
   * Create top-up payment session
   * @param {string} userId - User ID
   * @param {number} amount - Amount in TRY
   * @returns {Object} - Payment session
   */
  async createTopupSession(userId, amount) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const wallet = await this.getWalletByUserId(userId, transaction);
      const user = await User.findByPk(userId, { transaction });

      if (!wallet.is_active) {
        throw new Error('Cüzdan aktif değil');
      }

      // Test modu: Direkt olarak ödemeyi işle
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if transaction already processed
      const existingTransaction = await Transaction.findOne({
        where: {
          reference_type: 'payment',
          reference_id: paymentId,
        },
        transaction,
      });

      if (existingTransaction) {
        await transaction.rollback();
        throw new Error('Ödeme zaten işlenmiş');
      }

      // Create credit transaction
      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      const creditTransaction = await Transaction.create(
        {
          wallet_id: wallet.id,
          type: 'credit',
          amount: parseFloat(amount),
          balance_after: newBalance,
          reference_type: 'payment',
          reference_id: paymentId,
          description: `Cüzdan yükleme - ${paymentId}`,
        },
        { transaction }
      );

      // Update wallet balance
      await wallet.update(
        { balance: newBalance },
        { transaction }
      );

      await transaction.commit();

      logger.info(`Payment processed successfully: ${paymentId}, Wallet: ${wallet.id}, Amount: ${amount}`);

      // Send notification
      if (user) {
        await notificationService.sendWalletTopupConfirmation(
          user,
          amount,
          newBalance
        );
      }

      return {
        paymentId,
        success: true,
        amount,
        newBalance,
        currency: 'TRY',
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Create topup session error:', error);
      throw error;
    }
  }

  /**
   * Process top-up webhook
   * @param {Object} webhookData - Webhook data
   * @returns {Object} - Process result
   */
  async processTopupWebhook(webhookData) {
    const result = await paymentService.processPaymentWebhook(webhookData);

    if (result.success) {
      // Get user and send notification
      const wallet = await Wallet.findByPk(webhookData.walletId, {
        include: [{ model: User, as: 'user' }],
      });

      if (wallet && wallet.user) {
        await notificationService.sendWalletTopupConfirmation(
          wallet.user,
          webhookData.amount,
          result.newBalance
        );
      }
    }

    return result;
  }

  /**
   * Get transaction history
   * @param {string} userId - User ID
   * @param {Object} options - { page, limit, type }
   * @returns {Object} - { transactions, pagination }
   */
  async getTransactionHistory(userId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const wallet = await this.getWalletByUserId(userId);

    const where = { wallet_id: wallet.id };

    if (options.type) {
      where.type = options.type;
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      transactions,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Create pending transaction (for meal reservations)
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @param {string} description - Description
   * @param {Object} transaction - Sequelize transaction
   * @returns {Object} - Created transaction
   */
  async createPendingTransaction(walletId, amount, referenceType, referenceId, description, transaction) {
    const wallet = await Wallet.findByPk(walletId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (wallet.balance < amount) {
      throw new Error('Yetersiz bakiye');
    }

    const pendingTransaction = await Transaction.create(
      {
        wallet_id: walletId,
        type: 'pending_debit',
        amount: amount,
        balance_after: wallet.balance, // Don't deduct yet
        reference_type: referenceType,
        reference_id: referenceId,
        description: description,
      },
      { transaction }
    );

    return pendingTransaction;
  }

  /**
   * Complete pending transaction (deduct from wallet)
   * @param {string} userId - User ID
   * @param {number} amount - Amount
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @param {Object} transaction - Sequelize transaction
   */
  async completePendingTransaction(userId, amount, referenceType, referenceId, transaction) {
    const wallet = await Wallet.findByPk(
      (await this.getWalletByUserId(userId, transaction)).id,
      {
        lock: transaction.LOCK.UPDATE,
        transaction,
      }
    );

    // Find pending transaction
    const pendingTransaction = await Transaction.findOne({
      where: {
        wallet_id: wallet.id,
        type: 'pending_debit',
        reference_type: referenceType,
        reference_id: referenceId,
      },
      transaction,
    });

    if (!pendingTransaction) {
      throw new Error('Bekleyen işlem bulunamadı');
    }

    // Deduct from balance
    const newBalance = parseFloat(wallet.balance) - parseFloat(amount);

    if (newBalance < 0) {
      throw new Error('Yetersiz bakiye');
    }

    // Update pending transaction to debit
    await pendingTransaction.update(
      {
        type: 'debit',
        balance_after: newBalance,
      },
      { transaction }
    );

    // Update wallet balance
    await wallet.update({ balance: newBalance }, { transaction });
  }

  /**
   * Refund transaction (add to wallet)
   * @param {string} userId - User ID
   * @param {number} amount - Amount
   * @param {string} referenceType - Reference type
   * @param {string} referenceId - Reference ID
   * @param {string} description - Description
   * @param {Object} transaction - Sequelize transaction
   */
  async refundTransaction(userId, amount, referenceType, referenceId, description, transaction) {
    const wallet = await Wallet.findByPk(
      (await this.getWalletByUserId(userId, transaction)).id,
      {
        lock: transaction.LOCK.UPDATE,
        transaction,
      }
    );

    const newBalance = parseFloat(wallet.balance) + parseFloat(amount);

    // Create credit transaction
    await Transaction.create(
      {
        wallet_id: wallet.id,
        type: 'credit',
        amount: parseFloat(amount),
        balance_after: newBalance,
        reference_type: referenceType,
        reference_id: referenceId,
        description: description,
      },
      { transaction }
    );

    // Update wallet balance
    await wallet.update({ balance: newBalance }, { transaction });
  }
}

module.exports = new WalletService();

