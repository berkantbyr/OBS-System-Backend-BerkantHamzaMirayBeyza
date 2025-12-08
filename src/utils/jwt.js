const jwt = require('jsonwebtoken');
const config = require('../config/jwt');

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.secret, {
    expiresIn: config.accessTokenExpiry,
  });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.secret, {
    expiresIn: config.refreshTokenExpiry,
  });
};

/**
 * Generate password reset token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateResetToken = (payload) => {
  return jwt.sign(payload, config.secret, {
    expiresIn: config.resetTokenExpiry,
  });
};

/**
 * Generate email verification token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateVerificationToken = (payload) => {
  return jwt.sign(payload, config.secret, {
    expiresIn: config.verificationTokenExpiry,
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Get token expiration date
 * @param {string} expiresIn - Expiration time (e.g., '15m', '7d')
 * @returns {Date} Expiration date
 */
const getExpirationDate = (expiresIn) => {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    throw new Error('Invalid expiration format');
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
  }
  
  return now;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  generateVerificationToken,
  verifyToken,
  decodeToken,
  getExpirationDate,
};

