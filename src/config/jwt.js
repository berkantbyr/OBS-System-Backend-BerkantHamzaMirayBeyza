require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  resetTokenExpiry: '24h',
  verificationTokenExpiry: '24h',
};

