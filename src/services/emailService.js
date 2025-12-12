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

// Close transporter function for graceful shutdown
const closeTransporter = async () => {
  try {
    if (transporter && transporter.close) {
      transporter.close();
      logger.info('Email transporter closed.');
    }
  } catch (error) {
    logger.warn('Error closing email transporter:', error.message);
  }
};

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
    // Debug: Log email configuration status
    logger.info('=== EMAIL CONFIGURATION DEBUG ===');
    logger.info(`EMAIL_USER: ${emailConfig.auth.user ? 'SET (' + emailConfig.auth.user + ')' : 'NOT SET'}`);
    logger.info(`EMAIL_PASS: ${emailConfig.auth.pass ? 'SET (' + emailConfig.auth.pass.substring(0, 4) + '****)' : 'NOT SET'}`);
    logger.info(`EMAIL_HOST: ${emailConfig.host}`);
    logger.info(`EMAIL_PORT: ${emailConfig.port}`);
    logger.info(`EMAIL_FROM: ${emailConfig.from}`);
    logger.info('================================');
    
    // Check if email is configured
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      logger.warn('Email not configured. EMAIL_USER and EMAIL_PASS must be set in .env file.');
      logger.warn('Email would be sent to:', options.to, 'Subject:', options.subject);
      // In development, we can log the reset token instead of sending email
      if (process.env.NODE_ENV === 'development') {
        // Extract token from email content
        const tokenMatch = options.html?.match(/<div class="token">([^<]+)<\/div>/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          logger.info('═══════════════════════════════════════════════════════');
          logger.info('🔐 ŞİFRE SIFIRLAMA KODU (Development Mode)');
          logger.info('═══════════════════════════════════════════════════════');
          logger.info(`E-posta: ${options.to}`);
          logger.info(`Token: ${token}`);
          logger.info(`Reset URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`);
          logger.info('═══════════════════════════════════════════════════════');
        }
      }
      // Don't throw error in development to allow testing
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Email service is not configured');
      }
      return { messageId: 'dev-mode-no-email' };
    }

    const mailOptions = {
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    logger.info(`Attempting to send email to: ${options.to}`);
    logger.info(`Email subject: ${options.subject}`);
    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Email sent successfully to ${options.to}: ${info.messageId}`);
    logger.info(`Email response: ${JSON.stringify(info.response)}`);
    return info;
  } catch (error) {
    logger.error('Email send error:', error);
    // Log more details about the error
    if (error.code === 'EAUTH') {
      logger.error('Email authentication failed. Check EMAIL_USER and EMAIL_PASS in .env');
    }
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
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  // In development mode, always log the token
  if (process.env.NODE_ENV === 'development') {
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('🔐 ŞİFRE SIFIRLAMA KODU (Development Mode)');
    logger.info('═══════════════════════════════════════════════════════');
    logger.info(`E-posta: ${to}`);
    logger.info(`Token: ${token}`);
    logger.info(`Reset URL: ${resetUrl}`);
    logger.info('═══════════════════════════════════════════════════════');
  }
  
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
        .token-box { background: #fff; border: 2px solid #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .token { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 3px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Şifre Sıfırlama</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${firstName},</h2>
          <p>Şifrenizi sıfırlamak için bir talep aldık. Aşağıdaki kodu kullanarak şifrenizi sıfırlayabilirsiniz:</p>
          
          <div class="token-box">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Şifre Sıfırlama Kodu:</p>
            <div class="token">${token}</div>
          </div>
          
          <p>Bu kodu şifre sıfırlama sayfasına girerek yeni şifrenizi belirleyebilirsiniz.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
          </div>
          
          <p style="font-size: 12px; color: #666;">Veya aşağıdaki bağlantıyı kullanabilirsiniz:</p>
          <p style="background: #eee; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
          
          <p style="font-size: 12px; color: #666;">Bu kod 24 saat geçerlidir.</p>
          
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

/**
 * Send grade update notification email to student
 * @param {string} to - Student email
 * @param {string} firstName - Student's first name
 * @param {string} courseCode - Course code
 * @param {string} courseName - Course name
 * @param {Object} grades - { midterm, final, homework, average, letterGrade }
 */
const sendGradeUpdateEmail = async (to, firstName, courseCode, courseName, grades) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .grade-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .grade-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .grade-row:last-child { border-bottom: none; }
        .grade-label { font-weight: bold; color: #666; }
        .grade-value { color: #333; font-size: 18px; }
        .letter-grade { font-size: 24px; font-weight: bold; color: #667eea; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Not Güncellemesi</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${firstName},</h2>
          <p><strong>${courseCode} - ${courseName}</strong> dersiniz için notlarınız güncellenmiştir.</p>
          
          <div class="grade-box">
            <div class="grade-row">
              <span class="grade-label">Vize:</span>
              <span class="grade-value">${grades.midterm !== null ? grades.midterm.toFixed(1) : '-'}</span>
            </div>
            ${grades.final !== null ? `
            <div class="grade-row">
              <span class="grade-label">Final:</span>
              <span class="grade-value">${grades.final.toFixed(1)}</span>
            </div>
            ` : ''}
            ${grades.homework !== null ? `
            <div class="grade-row">
              <span class="grade-label">Ödev:</span>
              <span class="grade-value">${grades.homework.toFixed(1)}</span>
            </div>
            ` : ''}
            ${grades.average !== null ? `
            <div class="grade-row">
              <span class="grade-label">Ortalama:</span>
              <span class="grade-value">${grades.average.toFixed(1)}</span>
            </div>
            ` : ''}
            ${grades.letterGrade ? `
            <div class="grade-row">
              <span class="grade-label">Harf Notu:</span>
              <span class="grade-value letter-grade">${grades.letterGrade}</span>
            </div>
            ` : ''}
          </div>
          
          <p>Detaylı bilgi için sisteme giriş yapabilirsiniz.</p>
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
    subject: `${courseCode} - Not Güncellemesi - Üniversite OBS`,
    html,
  });
};

/**
 * Send attendance session notification email to students
 * @param {string} to - Student email
 * @param {string} firstName - Student's first name
 * @param {string} courseCode - Course code
 * @param {string} courseName - Course name
 * @param {string} date - Session date
 * @param {string} startTime - Session start time
 * @param {string} qrCode - QR code for check-in
 */
const sendAttendanceSessionEmail = async (to, firstName, courseCode, courseName, date, startTime, qrCode) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-row { padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-weight: bold; color: #666; }
        .qr-code { background: #f0f0f0; padding: 15px; border-radius: 4px; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; color: #667eea; margin: 15px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 Yoklama Oturumu Açıldı</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${firstName},</h2>
          <p><strong>${courseCode} - ${courseName}</strong> dersi için yoklama oturumu açılmıştır.</p>
          
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Ders:</span>
              <span>${courseCode} - ${courseName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tarih:</span>
              <span>${date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Saat:</span>
              <span>${startTime}</span>
            </div>
            ${qrCode ? `
            <div class="info-row">
              <span class="info-label">QR Kod:</span>
              <div class="qr-code">${qrCode}</div>
            </div>
            ` : ''}
          </div>
          
          <p>Yoklama vermek için sisteme giriş yapabilirsiniz.</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/attendance/give" class="button">Yoklama Ver</a>
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
    subject: `${courseCode} - Yoklama Oturumu Açıldı - Üniversite OBS`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendGradeUpdateEmail,
  sendAttendanceSessionEmail,
  closeTransporter,
};

