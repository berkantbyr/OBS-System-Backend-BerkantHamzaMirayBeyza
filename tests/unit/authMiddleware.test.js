const { authenticate, authorize, optionalAuth } = require('../../src/middleware/auth');
const { verifyToken } = require('../../src/utils/jwt');
const db = require('../../src/models');
const logger = require('../../src/utils/logger');

// Mock dependencies
jest.mock('../../src/utils/jwt');
jest.mock('../../src/models');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('Auth Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      headers: {},
      user: null,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-id', email: 'test@test.com', role: 'student' };
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        role: 'student',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
      };

      req.headers.authorization = `Bearer ${token}`;
      verifyToken.mockReturnValue(decoded);
      db.User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(verifyToken).toHaveBeenCalledWith(token);
      expect(db.User.findByPk).toHaveBeenCalledWith(decoded.userId);
      expect(req.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        firstName: mockUser.first_name,
        lastName: mockUser.last_name,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no authorization header', async () => {
      req.headers.authorization = undefined;

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Yetkilendirme gerekli. Lütfen giriş yapın.',
        code: 'AUTH_REQUIRED',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Invalid token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Yetkilendirme gerekli. Lütfen giriş yapın.',
        code: 'AUTH_REQUIRED',
      });
    });

    it('should return 401 if token is expired', async () => {
      const token = 'expired-token';
      req.headers.authorization = `Bearer ${token}`;
      
      const error = new Error('Token has expired');
      verifyToken.mockImplementation(() => {
        throw error;
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
        code: 'INVALID_TOKEN',
      });
    });

    it('should return 401 if token is invalid', async () => {
      const token = 'invalid-token';
      req.headers.authorization = `Bearer ${token}`;
      
      const error = new Error('Invalid token');
      verifyToken.mockImplementation(() => {
        throw error;
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Geçersiz token',
        code: 'INVALID_TOKEN',
      });
    });

    it('should return 401 if user not found', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'non-existent-id' };
      req.headers.authorization = `Bearer ${token}`;
      
      verifyToken.mockReturnValue(decoded);
      db.User.findByPk = jest.fn().mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kullanıcı bulunamadı',
        code: 'USER_NOT_FOUND',
      });
    });

    it('should return 403 if user is inactive', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-id' };
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        role: 'student',
        first_name: 'Test',
        last_name: 'User',
        is_active: false,
      };

      req.headers.authorization = `Bearer ${token}`;
      verifyToken.mockReturnValue(decoded);
      db.User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Hesabınız devre dışı bırakılmış',
        code: 'ACCOUNT_DISABLED',
      });
    });

    it('should handle unexpected errors', async () => {
      const token = 'valid-token';
      req.headers.authorization = `Bearer ${token}`;
      
      verifyToken.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Kimlik doğrulama hatası',
        code: 'AUTH_ERROR',
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow access for authorized role', () => {
      req.user = { role: 'admin' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for multiple roles', () => {
      req.user = { role: 'admin' };
      const middleware = authorize('admin', 'faculty');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      req.user = { role: 'student' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmamaktadır',
        code: 'FORBIDDEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user not authenticated', () => {
      req.user = null;
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Yetkilendirme gerekli',
        code: 'AUTH_REQUIRED',
      });
    });
  });

  describe('optionalAuth', () => {
    it('should attach user if valid token provided', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-id' };
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        role: 'student',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
      };

      req.headers.authorization = `Bearer ${token}`;
      verifyToken.mockReturnValue(decoded);
      db.User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if no token provided', async () => {
      req.headers.authorization = undefined;

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user if token is invalid', async () => {
      const token = 'invalid-token';
      req.headers.authorization = `Bearer ${token}`;
      
      verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should not attach user if user is inactive', async () => {
      const token = 'valid-token';
      const decoded = { userId: 'user-id' };
      const mockUser = {
        id: 'user-id',
        is_active: false,
      };

      req.headers.authorization = `Bearer ${token}`;
      verifyToken.mockReturnValue(decoded);
      db.User.findByPk = jest.fn().mockResolvedValue(mockUser);

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      req.headers.authorization = 'Bearer token';
      verifyToken.mockImplementation(() => {
        throw new Error('Error');
      });

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

