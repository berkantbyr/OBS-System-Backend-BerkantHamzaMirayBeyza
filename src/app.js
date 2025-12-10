require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const db = require('./models');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Local IP adresini al (ağdaki erişim için)
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow multiple origins for different devices
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  // Google Cloud Run frontend URL'leri
  'https://obs-frontend-214391529742.europe-west1.run.app',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches local network pattern
    const isLocalNetwork = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)\d+\.\d+(:\d+)?$/.test(origin);
    // Google Cloud Run URL pattern
    const isCloudRun = /^https:\/\/.*\.run\.app$/.test(origin);
    const isAllowed = allowedOrigins.includes(origin) || isLocalNetwork || isCloudRun;
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        // Production'da da Cloud Run URL'lerini kabul et
        logger.warn(`CORS checking origin: ${origin}`);
        // Cloud Run URL'lerini her zaman kabul et
        if (origin && origin.includes('.run.app')) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('CORS policy violation'));
        }
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
};

// Middleware
// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Üniversite OBS API',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync database (in development)
    // Note: alter: true can cause issues with too many indexes
    // Use force: false to avoid dropping tables, and only sync if needed
    if (process.env.NODE_ENV === 'development') {
      try {
        // Try alter first, but catch errors if too many indexes
        await db.sequelize.sync({ alter: true });
        logger.info('Database synced with alter');
      } catch (syncError) {
        // If alter fails (e.g., too many indexes), just authenticate
        if (syncError.message.includes('Too many keys') || syncError.message.includes('max 64 keys')) {
          logger.warn('Database sync with alter failed due to index limit. Tables already exist, continuing...');
          logger.warn('If you need to modify schema, use migrations instead of sync');
        } else {
          throw syncError;
        }
      }
    }

    // Start server - 0.0.0.0 ile ağdaki diğer cihazlardan erişime izin ver
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
      logger.info(`Server is running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Local: http://localhost:${PORT}`);
      logger.info(`Network: http://${getLocalIP()}:${PORT}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();

module.exports = app;

