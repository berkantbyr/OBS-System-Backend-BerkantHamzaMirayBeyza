const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Register new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: result.user,
    });
  } catch (error) {
    logger.error('Register error:', error);
    
    if (error.message.includes('zaten kayıtlı')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_ENTRY',
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'REGISTRATION_ERROR',
    });
  }
};

/**
 * Verify email
 * POST /api/v1/auth/verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'VERIFICATION_ERROR',
    });
  }
};

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gerekli',
        code: 'MISSING_EMAIL',
      });
    }
    
    const result = await authService.resendVerification(email);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    
    if (error.message.includes('zaten doğrulanmış')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'ALREADY_VERIFIED',
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'RESEND_ERROR',
    });
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const metadata = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
    
    const result = await authService.login(email, password, metadata);
    
    res.status(200).json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    const status = error.message.includes('doğrulayın') ? 403 : 401;
    
    res.status(status).json({
      success: false,
      message: error.message,
      code: 'LOGIN_ERROR',
    });
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token gerekli',
        code: 'MISSING_TOKEN',
      });
    }
    
    const result = await authService.refreshAccessToken(refreshToken);
    
    res.status(200).json({
      success: true,
      message: 'Token yenilendi',
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    
    res.status(401).json({
      success: false,
      message: error.message,
      code: 'REFRESH_ERROR',
    });
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    await authService.logout(refreshToken);
    
    res.status(204).send();
  } catch (error) {
    logger.error('Logout error:', error);
    // Still return success even if error
    res.status(204).send();
  }
};

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    
    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi',
    });
  }
};

/**
 * Reset password
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    // confirmPassword is validated by schema, but we use password for reset
    const result = await authService.resetPassword(token, password);
    
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message,
      code: 'RESET_ERROR',
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};

