const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const walletController = require('../controllers/walletController');

/**
 * Wallet Routes
 * Base path: /api/v1/wallet
 */

router.get('/balance', authenticate, walletController.getBalance);
router.post('/topup', authenticate, walletController.createTopup);
router.post('/topup/webhook', walletController.processTopupWebhook); // No auth - webhook signature verification instead
router.get('/transactions', authenticate, walletController.getTransactions);

module.exports = router;

