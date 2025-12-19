const logger = require('../utils/logger');
const db = require('../models');
const { Transaction, Wallet } = db;

/**
 * PaymentService - Handles payment gateway integration (Stripe/PayTR)
 */
class PaymentService {
  /**
   * Minimum top-up amount in TRY
   */
  MIN_TOPUP_AMOUNT = 50;

  /**
   * Create payment session for wallet top-up
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount in TRY
   * @param {Object} userInfo - User information
   * @returns {Object} - Payment session data
   */
  async createTopupSession(walletId, amount, userInfo) {
    try {
      if (amount < this.MIN_TOPUP_AMOUNT) {
        throw new Error(`Minimum yükleme tutarı ${this.MIN_TOPUP_AMOUNT} TRY'dir`);
      }

      // TODO: Integrate with Stripe or PayTR
      // For now, return mock payment URL
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`Creating payment session for wallet ${walletId}, amount: ${amount} TRY`);

      // In production, this would create a Stripe Checkout Session or PayTR payment
      // Example for Stripe:
      // const session = await stripe.checkout.sessions.create({
      //   payment_method_types: ['card'],
      //   line_items: [{
      //     price_data: {
      //       currency: 'try',
      //       product_data: { name: 'Cüzdan Yükleme' },
      //       unit_amount: amount * 100, // Convert to kuruş
      //     },
      //     quantity: 1,
      //   }],
      //   mode: 'payment',
      //   success_url: `${process.env.FRONTEND_URL}/wallet/success?session_id={CHECKOUT_SESSION_ID}`,
      //   cancel_url: `${process.env.FRONTEND_URL}/wallet/cancel`,
      //   metadata: { walletId, userId: userInfo.id },
      // });

      return {
        paymentId,
        paymentUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wallet/payment/${paymentId}`,
        amount,
        currency: 'TRY',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };
    } catch (error) {
      logger.error('Create topup session error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (Stripe/PayTR)
   * @param {string} signature - Webhook signature
   * @param {string} payload - Request payload
   * @returns {boolean} - True if signature is valid
   */
  verifyWebhookSignature(signature, payload) {
    // TODO: Implement signature verification
    // For Stripe: stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    // For PayTR: Verify using PayTR's signature algorithm
    logger.info('Verifying webhook signature');
    return true; // Mock for now
  }

  /**
   * Process successful payment webhook
   * @param {Object} paymentData - Payment data from webhook
   * @returns {Object} - Processed payment result
   */
  async processPaymentWebhook(paymentData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const { walletId, amount, paymentId, metadata } = paymentData;

      logger.info(`Processing payment webhook: ${paymentId}, Wallet: ${walletId}, Amount: ${amount}`);

      // Find wallet
      const wallet = await Wallet.findByPk(walletId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet) {
        throw new Error('Cüzdan bulunamadı');
      }

      if (!wallet.is_active) {
        throw new Error('Cüzdan aktif değil');
      }

      // Check if transaction already processed
      const existingTransaction = await Transaction.findOne({
        where: {
          reference_type: 'payment',
          reference_id: paymentId,
        },
        transaction,
      });

      if (existingTransaction) {
        logger.warn(`Payment already processed: ${paymentId}`);
        await transaction.rollback();
        return { success: true, message: 'Ödeme zaten işlenmiş' };
      }

      // Create credit transaction
      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      const creditTransaction = await Transaction.create(
        {
          wallet_id: walletId,
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

      logger.info(`Payment processed successfully: ${paymentId}, New balance: ${newBalance} TRY`);

      return {
        success: true,
        transaction: creditTransaction,
        newBalance,
      };
    } catch (error) {
      logger.error('Process payment webhook error:', error);
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new PaymentService();

