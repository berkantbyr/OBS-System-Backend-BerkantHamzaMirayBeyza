require('dotenv').config();

// Email provider: 'sendgrid' or 'smtp' (default: 'sendgrid' for production)
const emailProvider = process.env.EMAIL_PROVIDER || 'sendgrid';

module.exports = {
  provider: emailProvider,
  
  // SendGrid Configuration
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  sendgridFrom: process.env.SENDGRID_FROM || process.env.EMAIL_FROM || 'system.obs1111@gmail.com',
  
  // SMTP Configuration (fallback or for development)
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
  
  // FROM address: Use EMAIL_FROM if set, otherwise use EMAIL_USER
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'system.obs1111@gmail.com',
};

