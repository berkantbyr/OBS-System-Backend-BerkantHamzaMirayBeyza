require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const db = require('./models');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { closeTransporter } = require('./services/emailService');

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
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
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

// Root endpoint - Cloud Run health check için
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Üniversite OBS API',
    version: '1.0.0',
    database: dbConnected ? 'connected' : 'connecting...',
    documentation: '/api/v1/health',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Server instance for graceful shutdown
let server = null;

// Shutdown flag to prevent multiple shutdown attempts
let isShuttingDown = false;

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring duplicate signal.');
    return;
  }

  isShuttingDown = true;
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  const shutdown = async () => {
    try {
      // Close email transporter first (fast operation)
      try {
        await closeTransporter();
        logger.info('Email transporter closed.');
      } catch (emailError) {
        logger.warn('Error closing email transporter:', emailError.message);
      }

      // Close database connection
      try {
        await db.sequelize.close();
        logger.info('Database connection closed.');
      } catch (dbError) {
        logger.error('Error closing database connection:', dbError);
      }

      logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  if (server) {
    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed.');
      shutdown();
    });

    // Force close after 5 seconds (reduced from 10)
    setTimeout(() => {
      logger.error('Forced shutdown after timeout.');
      if (server) {
        server.close(() => { });
      }
      shutdown();
    }, 5000);
  } else {
    // If server is not running, just close connections
    await shutdown();
  }
};

// Initialize background jobs (if enabled)
const initializeBackgroundJobs = () => {
  if (process.env.ENABLE_BACKGROUND_JOBS === 'true') {
    try {
      const { initializeJobs } = require('./jobs');
      initializeJobs();
      logger.info('Background jobs initialized');
    } catch (error) {
      logger.warn('Failed to initialize background jobs:', error.message);
    }
  } else {
    logger.info('Background jobs disabled (set ENABLE_BACKGROUND_JOBS=true to enable)');
  }
};

// Database connection status
let dbConnected = false;

// Connect to database (can be called after server starts)
const connectDatabase = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries && !dbConnected) {
    try {
      // Test database connection
      await db.sequelize.authenticate();
      logger.info('Database connection established successfully');
      dbConnected = true;

      // Sync database
      // Note: alter: true can cause issues with too many indexes
      // Use force: false to avoid dropping tables, and only sync if needed
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
          logger.error('Database sync error:', syncError.message);
        }
      }

      // Initialize background jobs after database connects
      initializeBackgroundJobs();
      return true;
    } catch (error) {
      retries++;
      logger.error(`Database connection attempt ${retries}/${maxRetries} failed:`, error.message);
      if (retries < maxRetries) {
        logger.info(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  if (!dbConnected) {
    logger.error('Failed to connect to database after all retries. API will return errors for database operations.');
  }
  return dbConnected;
};

// Database connection and server start
const startServer = async () => {
  try {
    // Start server FIRST - 0.0.0.0 ile ağdaki diğer cihazlardan erişime izin ver
    // This ensures Cloud Run health check passes immediately
    const HOST = process.env.HOST || '0.0.0.0';
    server = app.listen(PORT, HOST, () => {
      logger.info(`Server is running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Local: http://localhost:${PORT}`);
      logger.info(`Network: http://${getLocalIP()}:${PORT}`);

      // Connect to database AFTER server starts (non-blocking)
      connectDatabase().then((connected) => {
        if (connected) {
          logger.info('Database ready - API fully operational');
        } else {
          logger.warn('Database not connected - some API endpoints may fail');
        }
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Please free the port or use a different one.`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception:', error);
  // Try graceful shutdown even on uncaught exception
  if (!isShuttingDown) {
    await gracefulShutdown('UNCAUGHT_EXCEPTION');
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
  // This allows the server to continue running
});

// Handle beforeExit (fires when event loop is empty)
process.on('beforeExit', (code) => {
  if (!isShuttingDown && server) {
    logger.info('beforeExit event received, initiating graceful shutdown...');
    gracefulShutdown('BEFORE_EXIT');
  }
});

// Handle termination signals (SIGTERM, SIGINT)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle Windows termination (CMD X button, etc.)
if (process.platform === 'win32') {
  // Handle stdin close (when terminal is closed)
  if (process.stdin.isTTY && process.env.NODE_ENV !== 'test') {
    process.stdin.on('close', () => {
      logger.info('stdin closed, initiating shutdown...');
      gracefulShutdown('STDIN_CLOSE');
    });
  }

  // Handle readline for Ctrl+C
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', () => {
    gracefulShutdown('SIGINT');
  });

  // Handle process exit (last resort)
  process.on('exit', (code) => {
    if (!isShuttingDown) {
      logger.warn(`Process exiting with code ${code}, attempting cleanup...`);
      // Try to close connections synchronously
      try {
        if (db.sequelize) {
          db.sequelize.close().catch(() => { });
        }
      } catch (e) {
        // Ignore errors during exit
      }
    }
  });
}

// Start the server
// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

