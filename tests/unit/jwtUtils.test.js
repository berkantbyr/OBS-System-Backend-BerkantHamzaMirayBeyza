const jwtUtils = require('../../src/utils/jwt');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../src/config/jwt', () => ({
  secret: 'test-secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  resetTokenExpiry: '24h',
  verificationTokenExpiry: '24h',
}));

describe('JWT Utils - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResetToken', () => {
    it('should generate reset token successfully', () => {
      const payload = { userId: 'user-id', email: 'test@test.com' };
      jwt.sign.mockReturnValue('reset-token');

      const token = jwtUtils.generateResetToken(payload);

      expect(token).toBe('reset-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        jwtConfig.secret,
        { expiresIn: jwtConfig.resetTokenExpiry }
      );
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate verification token successfully', () => {
      const payload = { userId: 'user-id', email: 'test@test.com' };
      jwt.sign.mockReturnValue('verification-token');

      const token = jwtUtils.generateVerificationToken(payload);

      expect(token).toBe('verification-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        jwtConfig.secret,
        { expiresIn: jwtConfig.verificationTokenExpiry }
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = 'test-token';
      const decoded = { userId: 'user-id', email: 'test@test.com' };
      jwt.decode.mockReturnValue(decoded);

      const result = jwtUtils.decodeToken(token);

      expect(result).toEqual(decoded);
      expect(jwt.decode).toHaveBeenCalledWith(token);
    });

    it('should return null for invalid token', () => {
      jwt.decode.mockReturnValue(null);

      const result = jwtUtils.decodeToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('getExpirationDate', () => {
    it('should calculate expiration date for seconds', () => {
      const expiresIn = '30s';
      const now = new Date();
      const expected = new Date(now.getTime() + 30 * 1000);

      const result = jwtUtils.getExpirationDate(expiresIn);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -2);
    });

    it('should calculate expiration date for minutes', () => {
      const expiresIn = '15m';
      const now = new Date();
      const expected = new Date(now.getTime() + 15 * 60 * 1000);

      const result = jwtUtils.getExpirationDate(expiresIn);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -2);
    });

    it('should calculate expiration date for hours', () => {
      const expiresIn = '2h';
      const now = new Date();
      const expected = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const result = jwtUtils.getExpirationDate(expiresIn);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -2);
    });

    it('should calculate expiration date for days', () => {
      const expiresIn = '7d';
      const now = new Date();
      const expected = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const result = jwtUtils.getExpirationDate(expiresIn);

      expect(result.getTime()).toBeCloseTo(expected.getTime(), -2);
    });

    it('should throw error for invalid expiration format', () => {
      expect(() => {
        jwtUtils.getExpirationDate('invalid');
      }).toThrow('Invalid expiration format');
    });

    it('should throw error for unsupported unit', () => {
      expect(() => {
        jwtUtils.getExpirationDate('5x');
      }).toThrow('Invalid expiration format');
    });

    it('should handle large values', () => {
      const expiresIn = '100d';
      const result = jwtUtils.getExpirationDate(expiresIn);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(new Date().getTime());
    });
  });

  describe('verifyToken error handling', () => {
    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        jwtUtils.verifyToken('expired-token');
      }).toThrow('Token has expired');
    });

    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        jwtUtils.verifyToken('invalid-token');
      }).toThrow('Invalid token');
    });

    it('should rethrow other errors', () => {
      const error = new Error('Unknown error');
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        jwtUtils.verifyToken('token');
      }).toThrow('Unknown error');
    });
  });
});

