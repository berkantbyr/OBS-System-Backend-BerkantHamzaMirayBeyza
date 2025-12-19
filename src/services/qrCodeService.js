const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * QRCodeService - Handles QR code generation and validation
 */
class QRCodeService {
  /**
   * Generate a unique QR code
   * @param {string} prefix - Optional prefix (e.g., 'MEAL', 'EVENT')
   * @returns {string} - Unique QR code
   */
  generateQRCode(prefix = '') {
    const uuid = uuidv4().replace(/-/g, '').toUpperCase();
    const qrCode = prefix ? `${prefix}-${uuid}` : uuid;
    logger.info(`Generated QR code: ${qrCode}`);
    return qrCode;
  }

  /**
   * Validate QR code format
   * @param {string} qrCode - QR code to validate
   * @returns {boolean} - True if valid format
   */
  validateQRCode(qrCode) {
    if (!qrCode || typeof qrCode !== 'string') {
      return false;
    }
    // Basic validation: should be alphanumeric with optional dashes
    return /^[A-Z0-9-]+$/.test(qrCode);
  }

  /**
   * Extract prefix from QR code
   * @param {string} qrCode - QR code
   * @returns {string|null} - Prefix or null
   */
  extractPrefix(qrCode) {
    const match = qrCode.match(/^([A-Z]+)-/);
    return match ? match[1] : null;
  }
}

module.exports = new QRCodeService();

