const { verifyToken } = require('../utils/jwt');
const db = require('../models');
const logger = require('../utils/logger');

const { User } = db;

/**
 * Authentication middleware - Verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli. Lütfen giriş yapın.',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: error.message === 'Token has expired' 
          ? 'Oturum süresi doldu. Lütfen tekrar giriş yapın.' 
          : 'Geçersiz token',
        code: 'INVALID_TOKEN',
      });
    }

    // Get user from database
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Hesabınız devre dışı bırakılmış',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Kimlik doğrulama hatası',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Authorization middleware - Checks user roles
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yetkilendirme gerekli',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmamaktadır',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

/**
 * Optional authentication - Attaches user if token present, continues otherwise
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyToken(token);
      const user = await User.findByPk(decoded.userId);

      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
        };
      }
    } catch (error) {
      // Token invalid but continue anyway for optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};

