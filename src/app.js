const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

// Import database
const db = require('./models');

// Import routes
const routes = require('./routes');

// Import middleware
const { globalLimiter } = require('./middleware/rateLimitMiddleware');

// Import jobs
const { initializeJobs } = require('./jobs');

// Import socket service
const { initializeSocket } = require('./services/socketService');

// Import logger
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiting
app.use(globalLimiter);

// Request logging
if (process.env.NODE_ENV !== 'test') {
    const morgan = require('morgan');
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'University OBS API',
        version: '4.0.0',
        documentation: '/api/v1/health'
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint bulunamadı',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Sunucu hatası',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Test database connection
        await db.sequelize.authenticate();
        logger.info('✅ Database connection established');

        // Sync database only in development/test environments
        // In production, use migrations instead of sync
        if (process.env.NODE_ENV !== 'production') {
            await db.sequelize.sync({ alter: false });
            logger.info('✅ Database synchronized');
        } else {
            logger.info('⚠️  Skipping database sync in production (use migrations)');
        }

        // Initialize background jobs
        if (process.env.NODE_ENV !== 'test') {
            initializeJobs();
        }

        // Start server
        server.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 API: http://localhost:${PORT}/api/v1`);
        });

    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed');
        db.sequelize.close().then(() => {
            logger.info('Database connection closed');
            process.exit(0);
        });
    });
});

// Start the server
startServer();

module.exports = app;
