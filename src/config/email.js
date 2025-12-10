require('dotenv').config();

module.exports = {
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
  // FROM address: Use EMAIL_FROM if set, otherwise use EMAIL_USER
  // Note: Gmail SMTP may require FROM to match EMAIL_USER for authentication
  // For production, consider using a professional email service (SendGrid, Mailgun, etc.)
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@university.edu',
};

