const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// SendGrid API Key'i ayarla
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@university.edu';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Üniversite OBS';

// SendGrid'i yapılandır
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info('✅ SendGrid API Key configured');
} else {
  logger.warn('⚠️ SENDGRID_API_KEY is not set. Email sending will not work.');
}

/**
 * Send email using SendGrid HTTP API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content
 */
const sendEmail = async (options) => {
  try {
    logger.info('=== SENDGRID EMAIL DEBUG ===');
    logger.info(`SENDGRID_API_KEY: ${SENDGRID_API_KEY ? 'SET' : 'NOT SET'}`);
    logger.info(`SENDGRID_FROM_EMAIL: ${SENDGRID_FROM_EMAIL}`);
    logger.info(`Recipient: ${options.to}`);
    logger.info(`Subject: ${options.subject}`);
    logger.info('============================');
    
    // Check if SendGrid is configured
    if (!SENDGRID_API_KEY) {
      logger.warn('SendGrid not configured. SENDGRID_API_KEY must be set in .env file.');
      
      // In development, log the verification URL if present
      if (process.env.NODE_ENV === 'development') {
        const verifyMatch = options.html?.match(/verify-email\/([^"<\s]+)/);
        if (verifyMatch) {
          logger.info('═══════════════════════════════════════════════════════');
          logger.info('📧 EMAIL DOĞRULAMA LİNKİ (Development Mode)');
          logger.info('═══════════════════════════════════════════════════════');
          logger.info(`E-posta: ${options.to}`);
          logger.info(`Doğrulama URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verifyMatch[1]}`);
          logger.info('═══════════════════════════════════════════════════════');
        }
      }
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Email service is not configured');
      }
      return { messageId: 'dev-mode-no-email' };
    }

    const msg = {
      to: options.to,
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    logger.info(`Sending email via SendGrid to: ${options.to}`);
    const response = await sgMail.send(msg);
    logger.info(`✅ Email sent successfully to ${options.to}`);
    logger.info(`SendGrid Response Status: ${response[0].statusCode}`);
    
    return { 
      messageId: response[0].headers['x-message-id'] || 'sendgrid-sent',
      statusCode: response[0].statusCode 
    };
  } catch (error) {
    logger.error('SendGrid email send error:', error);
    if (error.response) {
      logger.error('SendGrid API Error:', error.response.body);
    }
    throw error;
  }
};

/**
 * Send verification email
 */
const sendVerificationEmail = async (to, token, firstName) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;
  
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('📧 EMAIL DOĞRULAMA LİNKİ');
  logger.info(`E-posta: ${to}`);
  logger.info(`URL: ${verificationUrl}`);
  logger.info('═══════════════════════════════════════════════════════');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .link-box { background: #f8f9fa; padding: 15px; border-radius: 8px; word-break: break-all; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Üniversite OBS</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${firstName},</h2>
          <p>Üniversite Öğrenci Bilgi Sistemi'ne hoş geldiniz! Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın.</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">✉️ E-postamı Doğrula</a>
          </div>
          <p>Veya bu linki tarayıcınıza yapıştırın:</p>
          <div class="link-box">${verificationUrl}</div>
          <p style="color: #666; font-size: 14px;">⏰ Bu link 24 saat geçerlidir.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Üniversite OBS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '✉️ E-posta Adresinizi Doğrulayın - Üniversite OBS',
    html,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (to, token, firstName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('🔐 ŞİFRE SIFIRLAMA KODU');
  logger.info(`E-posta: ${to}`);
  logger.info(`Token: ${token}`);
  logger.info(`URL: ${resetUrl}`);
  logger.info('═══════════════════════════════════════════════════════');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .token-box { background: #f8f9fa; border: 2px solid #667eea; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0; }
        .token { font-size: 28px; font-weight: bold; color: #667eea; letter-spacing: 4px; font-family: monospace; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Şifre Sıfırlama</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${firstName},</h2>
          <p>Şifrenizi sıfırlamak için bir talep aldık. Aşağıdaki kodu kullanın:</p>
          <div class="token-box">
            <p style="margin: 0 0 10px 0; color: #666;">Şifre Sıfırlama Kodu:</p>
            <div class="token">${token}</div>
          </div>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">🔓 Şifremi Sıfırla</a>
          </div>
          <p style="color: #666; font-size: 14px;">⏰ Bu kod 24 saat geçerlidir.</p>
          <div class="warning">
            <strong>⚠️ Uyarı:</strong> Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelin.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Üniversite OBS</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '🔐 Şifre Sıfırlama Talebi - Üniversite OBS',
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
