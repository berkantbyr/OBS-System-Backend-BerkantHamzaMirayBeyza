const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');
const logger = require('../utils/logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: emailConfig.auth,
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email send error:', error);
    throw error;
  }
};

/**
 * Send verification email
 * @param {string} to - Recipient email
 * @param {string} token - Verification token
 * @param {string} firstName - User's first name
 */
const sendVerificationEmail = async (to, token, firstName) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Üniversite OBS</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${firstName},</h2>
          <p>Üniversite Öğrenci Bilgi Sistemi'ne hoş geldiniz! Hesabınızı aktifleştirmek için lütfen aşağıdaki butona tıklayın.</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">E-postamı Doğrula</a>
          </div>
          <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayın:</p>
          <p style="background: #eee; padding: 10px; border-radius: 4px; word-break: break-all;">${verificationUrl}</p>
          <p>Bu bağlantı 24 saat geçerlidir.</p>
          <p>Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
        </div>
        <div class="footer">
          <p>© 2024 Üniversite OBS. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'E-posta Adresinizi Doğrulayın - Üniversite OBS',
    html,
  });
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 * @param {string} firstName - User's first name
 */
const sendPasswordResetEmail = async (to, token, firstName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Şifre Sıfırlama</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${firstName},</h2>
          <p>Şifrenizi sıfırlamak için bir talep aldık. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
          </div>
          <p>Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayın:</p>
          <p style="background: #eee; padding: 10px; border-radius: 4px; word-break: break-all;">${resetUrl}</p>
          <p>Bu bağlantı 24 saat geçerlidir.</p>
          <div class="warning">
            <strong>⚠️ Uyarı:</strong> Eğer bu talebi siz yapmadıysanız, lütfen bu e-postayı görmezden gelin ve hesabınızın güvenliğini kontrol edin.
          </div>
        </div>
        <div class="footer">
          <p>© 2024 Üniversite OBS. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Şifre Sıfırlama Talebi - Üniversite OBS',
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};

