const walletService = require('../services/walletService');
const logger = require('../utils/logger');

/**
 * Get wallet balance
 * GET /api/v1/wallet/balance
 */
const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const balance = await walletService.getBalance(userId);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Bakiye sorgulanırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Create top-up session
 * POST /api/v1/wallet/topup
 */
const createTopup = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir tutar giriniz',
      });
    }

    const session = await walletService.createTopupSession(userId, amount);

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    logger.error('Create topup error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Process top-up webhook
 * POST /api/v1/wallet/topup/webhook
 */
const processTopupWebhook = async (req, res) => {
  try {
    // TODO: Verify webhook signature
    const webhookData = req.body;

    const result = await walletService.processTopupWebhook(webhookData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Process topup webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook işlenirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get transaction history
 * GET /api/v1/wallet/transactions
 */
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const result = await walletService.getTransactionHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'İşlem geçmişi alınırken hata oluştu',
      error: error.message,
    });
  }
};

module.exports = {
  getBalance,
  createTopup,
  processTopupWebhook,
  getTransactions,
};

