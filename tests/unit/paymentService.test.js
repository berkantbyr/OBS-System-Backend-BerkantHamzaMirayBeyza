const paymentService = require('../../src/services/paymentService');
const db = require('../../src/models');
const { Transaction, Wallet } = db;

// Mock dependencies
jest.mock('../../src/models');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Payment Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  describe('createTopupSession', () => {
    const mockWalletId = 'wallet-id-123';
    const mockUserInfo = { id: 'user-id-123', email: 'test@university.edu' };

    it('should successfully create a topup session', async () => {
      const amount = 100;
      const result = await paymentService.createTopupSession(mockWalletId, amount, mockUserInfo);

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('paymentUrl');
      expect(result.amount).toBe(amount);
      expect(result.currency).toBe('TRY');
      expect(result.paymentUrl).toContain('/wallet/payment/');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error if amount is below minimum', async () => {
      const amount = 30; // Below MIN_TOPUP_AMOUNT (50)

      await expect(
        paymentService.createTopupSession(mockWalletId, amount, mockUserInfo)
      ).rejects.toThrow('Minimum yükleme tutarı 50 TRY\'dir');
    });

    it('should generate unique payment IDs', async () => {
      const amount = 100;
      const result1 = await paymentService.createTopupSession(mockWalletId, amount, mockUserInfo);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const result2 = await paymentService.createTopupSession(mockWalletId, amount, mockUserInfo);

      expect(result1.paymentId).not.toBe(result2.paymentId);
    });

    it('should set expiration time to 30 minutes from now', async () => {
      const amount = 100;
      const beforeTime = new Date();
      const result = await paymentService.createTopupSession(mockWalletId, amount, mockUserInfo);
      const afterTime = new Date();

      const expiresAt = new Date(result.expiresAt);
      const expectedMin = new Date(beforeTime.getTime() + 30 * 60 * 1000);
      const expectedMax = new Date(afterTime.getTime() + 30 * 60 * 1000);

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature (mock implementation)', () => {
      const signature = 'test-signature';
      const payload = 'test-payload';

      const result = paymentService.verifyWebhookSignature(signature, payload);

      expect(result).toBe(true);
    });

    it('should handle different signature formats', () => {
      const signatures = ['sig1', 'sig2', 'stripe_sig_123'];
      const payload = 'test-payload';

      signatures.forEach(sig => {
        const result = paymentService.verifyWebhookSignature(sig, payload);
        expect(result).toBe(true);
      });
    });
  });

  describe('processPaymentWebhook', () => {
    const mockPaymentData = {
      walletId: 'wallet-id-123',
      amount: 100,
      paymentId: 'pay_123456789',
      metadata: { userId: 'user-id-123' },
    };

    beforeEach(() => {
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
        LOCK: { UPDATE: 'UPDATE' },
      };
      db.sequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);
    });

    it('should successfully process payment webhook', async () => {
      const mockWallet = {
        id: mockPaymentData.walletId,
        balance: 50,
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
      };

      Wallet.findByPk = jest.fn().mockResolvedValue(mockWallet);
      Transaction.findOne = jest.fn().mockResolvedValue(null);
      Transaction.create = jest.fn().mockResolvedValue({
        id: 'transaction-id',
        wallet_id: mockPaymentData.walletId,
        type: 'credit',
        amount: mockPaymentData.amount,
        balance_after: 150,
      });

      const result = await paymentService.processPaymentWebhook(mockPaymentData);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(150);
      expect(result.transaction).toBeDefined();
      expect(Wallet.findByPk).toHaveBeenCalledWith(mockPaymentData.walletId, expect.any(Object));
      expect(Transaction.create).toHaveBeenCalled();
      expect(mockWallet.update).toHaveBeenCalledWith(
        { balance: 150 },
        expect.any(Object)
      );
    });

    it('should throw error if wallet not found', async () => {
      Wallet.findByPk = jest.fn().mockResolvedValue(null);

      await expect(
        paymentService.processPaymentWebhook(mockPaymentData)
      ).rejects.toThrow('Cüzdan bulunamadı');
    });

    it('should throw error if wallet is not active', async () => {
      const mockWallet = {
        id: mockPaymentData.walletId,
        balance: 50,
        is_active: false,
      };

      Wallet.findByPk = jest.fn().mockResolvedValue(mockWallet);

      await expect(
        paymentService.processPaymentWebhook(mockPaymentData)
      ).rejects.toThrow('Cüzdan aktif değil');
    });

    it('should handle duplicate payment processing', async () => {
      const mockWallet = {
        id: mockPaymentData.walletId,
        balance: 50,
        is_active: true,
      };

      const mockExistingTransaction = {
        id: 'existing-transaction-id',
        reference_id: mockPaymentData.paymentId,
      };

      Wallet.findByPk = jest.fn().mockResolvedValue(mockWallet);
      Transaction.findOne = jest.fn().mockResolvedValue(mockExistingTransaction);

      const result = await paymentService.processPaymentWebhook(mockPaymentData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Ödeme zaten işlenmiş');
      expect(Transaction.create).not.toHaveBeenCalled();
    });

    it('should correctly calculate new balance', async () => {
      const mockWallet = {
        id: mockPaymentData.walletId,
        balance: 25.5,
        is_active: true,
        update: jest.fn().mockResolvedValue(true),
      };

      Wallet.findByPk = jest.fn().mockResolvedValue(mockWallet);
      Transaction.findOne = jest.fn().mockResolvedValue(null);
      Transaction.create = jest.fn().mockResolvedValue({
        id: 'transaction-id',
        amount: mockPaymentData.amount,
        balance_after: 125.5,
      });

      const result = await paymentService.processPaymentWebhook(mockPaymentData);

      expect(result.newBalance).toBe(125.5);
      expect(mockWallet.update).toHaveBeenCalledWith(
        { balance: 125.5 },
        expect.any(Object)
      );
    });

    it('should rollback transaction on error', async () => {
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
        LOCK: { UPDATE: 'UPDATE' },
      };
      db.sequelize.transaction = jest.fn().mockResolvedValue(mockTransaction);

      const mockWallet = {
        id: mockPaymentData.walletId,
        balance: 50,
        is_active: true,
        update: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      Wallet.findByPk = jest.fn().mockResolvedValue(mockWallet);
      Transaction.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        paymentService.processPaymentWebhook(mockPaymentData)
      ).rejects.toThrow('Database error');

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});

