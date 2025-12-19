const emailService = require('./emailService');
const logger = require('../utils/logger');

/**
 * NotificationService - Handles email, push, and SMS notifications
 */
class NotificationService {
  /**
   * Send meal reservation confirmation
   * @param {Object} user - User object
   * @param {Object} reservation - Reservation object
   * @param {Object} menu - Menu object
   */
  async sendMealReservationConfirmation(user, reservation, menu) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .qr-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .qr-code { font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; }
            .info-box { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .info-row:last-child { border-bottom: none; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ Yemek Rezervasyonu</h1>
            </div>
            <div class="content">
              <h2>Merhaba ${user.first_name},</h2>
              <p>Yemek rezervasyonunuz başarıyla oluşturuldu.</p>
              
              <div class="info-box">
                <div class="info-row">
                  <span><strong>Tarih:</strong></span>
                  <span>${new Date(reservation.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div class="info-row">
                  <span><strong>Öğün:</strong></span>
                  <span>${reservation.meal_type === 'breakfast' ? 'Kahvaltı' : reservation.meal_type === 'lunch' ? 'Öğle Yemeği' : 'Akşam Yemeği'}</span>
                </div>
                <div class="info-row">
                  <span><strong>Durum:</strong></span>
                  <span>${reservation.status === 'reserved' ? 'Rezerve Edildi' : reservation.status}</span>
                </div>
              </div>
              
              <div class="qr-box">
                <p style="margin: 0 0 10px 0; color: #666;">QR Kod:</p>
                <div class="qr-code">${reservation.qr_code}</div>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">Bu QR kodu yemekhanede gösteriniz.</p>
              </div>
              
              <p>Rezervasyonunuzu iptal etmek için en az 2 saat önceden iptal etmeniz gerekmektedir.</p>
            </div>
            <div class="footer">
              <p>© 2024 Üniversite OBS. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: 'Yemek Rezervasyonu Onayı - Üniversite OBS',
        html,
      });

      logger.info(`Meal reservation confirmation sent to ${user.email}`);
    } catch (error) {
      logger.error('Send meal reservation confirmation error:', error);
      // Don't throw - notification failures shouldn't break the flow
    }
  }

  /**
   * Send event registration confirmation
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @param {Object} registration - Registration object
   */
  async sendEventRegistrationConfirmation(user, event, registration) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .qr-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .qr-code { font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; }
            .info-box { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Etkinlik Kaydı</h1>
            </div>
            <div class="content">
              <h2>Merhaba ${user.first_name},</h2>
              <p><strong>${event.title}</strong> etkinliğine başarıyla kaydoldunuz.</p>
              
              <div class="info-box">
                <p><strong>Tarih:</strong> ${new Date(event.date).toLocaleDateString('tr-TR')}</p>
                <p><strong>Saat:</strong> ${event.start_time} - ${event.end_time}</p>
                <p><strong>Yer:</strong> ${event.location}</p>
              </div>
              
              <div class="qr-box">
                <p style="margin: 0 0 10px 0; color: #666;">Giriş QR Kodu:</p>
                <div class="qr-code">${registration.qr_code}</div>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">Bu QR kodu etkinlik girişinde gösteriniz.</p>
              </div>
            </div>
            <div class="footer">
              <p>© 2024 Üniversite OBS. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: `Etkinlik Kaydı: ${event.title} - Üniversite OBS`,
        html,
      });

      logger.info(`Event registration confirmation sent to ${user.email}`);
    } catch (error) {
      logger.error('Send event registration confirmation error:', error);
    }
  }

  /**
   * Send wallet top-up confirmation
   * @param {Object} user - User object
   * @param {number} amount - Top-up amount
   * @param {number} newBalance - New wallet balance
   */
  async sendWalletTopupConfirmation(user, amount, newBalance) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .balance-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .balance { font-size: 32px; font-weight: bold; color: #667eea; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Cüzdan Yükleme</h1>
            </div>
            <div class="content">
              <h2>Merhaba ${user.first_name},</h2>
              <p>Cüzdanınıza <strong>${amount} TRY</strong> yüklendi.</p>
              
              <div class="balance-box">
                <p style="margin: 0 0 10px 0; color: #666;">Yeni Bakiye:</p>
                <div class="balance">${newBalance.toFixed(2)} TRY</div>
              </div>
            </div>
            <div class="footer">
              <p>© 2024 Üniversite OBS. Tüm hakları saklıdır.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail({
        to: user.email,
        subject: 'Cüzdan Yükleme Onayı - Üniversite OBS',
        html,
      });

      logger.info(`Wallet topup confirmation sent to ${user.email}`);
    } catch (error) {
      logger.error('Send wallet topup confirmation error:', error);
    }
  }
}

module.exports = new NotificationService();

