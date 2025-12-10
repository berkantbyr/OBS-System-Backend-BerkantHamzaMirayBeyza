const emailService = require('../../src/services/emailService');
const nodemailer = require('nodemailer');
const logger = require('../../src/utils/logger');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('../../src/config/email', () => ({
  host: 'smtp.test.com',
  port: 587,
  secure: false,
  auth: {
    user: 'test@test.com',
    pass: 'testpass',
  },
  from: 'noreply@test.com',
}));
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Email Service - Unit Tests', () => {
  let mockTransporter;
  let mockSendMail;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:3000';
    
    mockSendMail = jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
    });

    mockTransporter = {
      sendMail: mockSendMail,
    };

    nodemailer.createTransport.mockReturnValue(mockTransporter);
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const options = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await emailService.sendEmail(options);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@test.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      expect(result).toHaveProperty('messageId');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should send email without text content', async () => {
      const options = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await emailService.sendEmail(options);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: undefined,
        })
      );
    });

    it('should handle email send error', async () => {
      const error = new Error('SMTP Error');
      mockSendMail.mockRejectedValue(error);

      const options = {
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      };

      await expect(emailService.sendEmail(options)).rejects.toThrow('SMTP Error');
      expect(logger.error).toHaveBeenCalledWith('Email send error:', error);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const to = 'user@test.com';
      const token = 'verification-token-123';
      const firstName = 'Test';

      await emailService.sendVerificationEmail(to, token, firstName);

      expect(mockSendMail).toHaveBeenCalled();
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(to);
      expect(callArgs.subject).toBe('E-posta Adresinizi Doğrulayın - Üniversite OBS');
      expect(callArgs.html).toContain(firstName);
      expect(callArgs.html).toContain(token);
      expect(callArgs.html).toContain('http://localhost:3000/verify-email/verification-token-123');
    });

    it('should include verification URL in email', async () => {
      const to = 'user@test.com';
      const token = 'test-token';
      const firstName = 'John';

      await emailService.sendVerificationEmail(to, token, firstName);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`${process.env.FRONTEND_URL}/verify-email/${token}`);
    });

    it('should include user first name in email content', async () => {
      const to = 'user@test.com';
      const token = 'test-token';
      const firstName = 'Jane';

      await emailService.sendVerificationEmail(to, token, firstName);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`Merhaba ${firstName}`);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const to = 'user@test.com';
      const token = 'reset-token-123';
      const firstName = 'Test';

      await emailService.sendPasswordResetEmail(to, token, firstName);

      expect(mockSendMail).toHaveBeenCalled();
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(to);
      expect(callArgs.subject).toBe('Şifre Sıfırlama Talebi - Üniversite OBS');
      expect(callArgs.html).toContain(firstName);
      expect(callArgs.html).toContain(token);
      expect(callArgs.html).toContain('http://localhost:3000/reset-password/reset-token-123');
    });

    it('should include reset URL in email', async () => {
      const to = 'user@test.com';
      const token = 'test-reset-token';
      const firstName = 'John';

      await emailService.sendPasswordResetEmail(to, token, firstName);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`${process.env.FRONTEND_URL}/reset-password/${token}`);
    });

    it('should include warning message in reset email', async () => {
      const to = 'user@test.com';
      const token = 'test-token';
      const firstName = 'Jane';

      await emailService.sendPasswordResetEmail(to, token, firstName);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Uyarı');
      expect(callArgs.html).toContain('Eğer bu talebi siz yapmadıysanız');
    });

    it('should include user first name in reset email', async () => {
      const to = 'user@test.com';
      const token = 'test-token';
      const firstName = 'John';

      await emailService.sendPasswordResetEmail(to, token, firstName);

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`Merhaba ${firstName}`);
    });
  });
});

