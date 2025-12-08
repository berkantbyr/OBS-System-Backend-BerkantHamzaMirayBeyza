const logger = require('../utils/logger');

/**
 * Not found handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Bulunamadı - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(err.message, { stack: err.stack });

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Doğrulama hatası',
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return res.status(409).json({
      success: false,
      message: `Bu ${field} zaten kullanılıyor`,
      code: 'DUPLICATE_ENTRY',
    });
  }

  // Sequelize foreign key error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'İlişkili kayıt bulunamadı',
      code: 'FOREIGN_KEY_ERROR',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token süresi dolmuş',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Dosya boyutu çok büyük. Maksimum 5MB yükleyebilirsiniz.',
      code: 'FILE_TOO_LARGE',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Beklenmeyen dosya alanı',
      code: 'UNEXPECTED_FILE',
    });
  }

  // Custom error with status
  const status = err.status || err.statusCode || 500;
  
  // Don't expose internal errors in production
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Sunucu hatası oluştu'
    : err.message || 'Sunucu hatası oluştu';

  res.status(status).json({
    success: false,
    message,
    code: err.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  notFound,
  errorHandler,
};

