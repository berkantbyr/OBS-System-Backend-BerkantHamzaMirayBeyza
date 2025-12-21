const qrCodeService = require('../../src/services/qrCodeService');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('QR Code Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateQRCode', () => {
    it('should generate a QR code without prefix', () => {
      const qrCode = qrCodeService.generateQRCode();

      expect(qrCode).toBeDefined();
      expect(typeof qrCode).toBe('string');
      expect(qrCode.length).toBeGreaterThan(0);
      // UUID without dashes is 32 characters
      expect(qrCode.length).toBe(32);
    });

    it('should generate a QR code with prefix', () => {
      const prefix = 'MEAL';
      const qrCode = qrCodeService.generateQRCode(prefix);

      expect(qrCode).toContain(prefix);
      expect(qrCode).toMatch(/^MEAL-[A-Z0-9]+$/);
      expect(qrCode.split('-')[0]).toBe(prefix);
    });

    it('should generate unique QR codes', () => {
      const qrCodes = new Set();
      for (let i = 0; i < 100; i++) {
        qrCodes.add(qrCodeService.generateQRCode('TEST'));
      }

      expect(qrCodes.size).toBe(100);
    });

    it('should generate QR codes with different prefixes', () => {
      const mealCode = qrCodeService.generateQRCode('MEAL');
      const eventCode = qrCodeService.generateQRCode('EVENT');

      expect(mealCode).toMatch(/^MEAL-/);
      expect(eventCode).toMatch(/^EVENT-/);
      expect(mealCode).not.toBe(eventCode);
    });

    it('should generate uppercase QR codes', () => {
      const qrCode = qrCodeService.generateQRCode('test');

      expect(qrCode).toMatch(/^TEST-[A-Z0-9]+$/);
      expect(qrCode).toBe(qrCode.toUpperCase());
    });
  });

  describe('validateQRCode', () => {
    it('should validate correct QR code format', () => {
      const validCodes = [
        'MEAL-1234567890ABCDEF1234567890ABCDEF',
        'EVENT-ABCDEF1234567890ABCDEF1234567890',
        'ABCDEF1234567890ABCDEF1234567890ABCD',
        'TEST-12345',
      ];

      validCodes.forEach(code => {
        expect(qrCodeService.validateQRCode(code)).toBe(true);
      });
    });

    it('should reject invalid QR code formats', () => {
      const invalidCodes = [
        null,
        undefined,
        '',
        'meal-lowercase',
        'MEAL-123@456', // Contains invalid character
        'MEAL-123 456', // Contains space
        'MEAL-123_456', // Contains underscore
        'MEAL-123.456', // Contains dot
        12345, // Not a string
        {},
        [],
      ];

      invalidCodes.forEach(code => {
        expect(qrCodeService.validateQRCode(code)).toBe(false);
      });
    });

    it('should handle empty string', () => {
      expect(qrCodeService.validateQRCode('')).toBe(false);
    });

    it('should handle special characters', () => {
      const codesWithSpecialChars = [
        'MEAL-123!456',
        'MEAL-123#456',
        'MEAL-123$456',
        'MEAL-123%456',
      ];

      codesWithSpecialChars.forEach(code => {
        expect(qrCodeService.validateQRCode(code)).toBe(false);
      });
    });
  });

  describe('extractPrefix', () => {
    it('should extract prefix from QR code with prefix', () => {
      const qrCode = 'MEAL-1234567890ABCDEF1234567890ABCDEF';
      const prefix = qrCodeService.extractPrefix(qrCode);

      expect(prefix).toBe('MEAL');
    });

    it('should extract different prefixes', () => {
      expect(qrCodeService.extractPrefix('EVENT-123456')).toBe('EVENT');
      expect(qrCodeService.extractPrefix('MEAL-123456')).toBe('MEAL');
      expect(qrCodeService.extractPrefix('TEST-123456')).toBe('TEST');
    });

    it('should return null for QR code without prefix', () => {
      const qrCode = '1234567890ABCDEF1234567890ABCDEF';
      const prefix = qrCodeService.extractPrefix(qrCode);

      expect(prefix).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(qrCodeService.extractPrefix('')).toBeNull();
      expect(qrCodeService.extractPrefix('123-456')).toBeNull(); // Starts with number
      expect(qrCodeService.extractPrefix(null)).toBeNull();
      expect(qrCodeService.extractPrefix(undefined)).toBeNull();
    });

    it('should extract prefix from codes with single letter prefix', () => {
      const qrCode = 'A-1234567890ABCDEF1234567890ABCDEF';
      const prefix = qrCodeService.extractPrefix(qrCode);

      expect(prefix).toBe('A');
    });

    it('should extract prefix from codes with long prefix', () => {
      const qrCode = 'VERYLONGPREFIX-1234567890ABCDEF1234567890ABCDEF';
      const prefix = qrCodeService.extractPrefix(qrCode);

      expect(prefix).toBe('VERYLONGPREFIX');
    });
  });

  describe('Integration: generate and validate', () => {
    it('should generate valid QR codes', () => {
      for (let i = 0; i < 50; i++) {
        const qrCode = qrCodeService.generateQRCode('TEST');
        expect(qrCodeService.validateQRCode(qrCode)).toBe(true);
      }
    });

    it('should extract correct prefix from generated codes', () => {
      const prefixes = ['MEAL', 'EVENT', 'TEST', 'QR'];
      
      prefixes.forEach(prefix => {
        const qrCode = qrCodeService.generateQRCode(prefix);
        const extracted = qrCodeService.extractPrefix(qrCode);
        expect(extracted).toBe(prefix);
      });
    });
  });
});

