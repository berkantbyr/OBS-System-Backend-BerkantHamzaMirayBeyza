const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;
const connectedUsers = new Map(); // userId -> socketId

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 */
const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            logger.error('Socket authentication failed:', err.message);
            next(new Error('Invalid authentication token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;

        // Store user's socket connection
        connectedUsers.set(userId, socket.id);
        logger.info(`🔌 User ${userId} connected via WebSocket`);

        // Join user-specific room for targeted notifications
        socket.join(`user:${userId}`);

        // Join role-based rooms
        socket.join(`role:${socket.userRole}`);

        // Handle subscription to sensor updates
        socket.on('subscribe:sensors', () => {
            socket.join('sensors');
            logger.info(`User ${userId} subscribed to sensor updates`);
        });

        socket.on('unsubscribe:sensors', () => {
            socket.leave('sensors');
            logger.info(`User ${userId} unsubscribed from sensor updates`);
        });

        // Handle subscription to attendance updates (for faculty)
        socket.on('subscribe:attendance', (sectionId) => {
            socket.join(`attendance:${sectionId}`);
            logger.info(`User ${userId} subscribed to attendance for section ${sectionId}`);
        });

        socket.on('unsubscribe:attendance', (sectionId) => {
            socket.leave(`attendance:${sectionId}`);
            logger.info(`User ${userId} unsubscribed from attendance for section ${sectionId}`);
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            connectedUsers.delete(userId);
            logger.info(`🔌 User ${userId} disconnected: ${reason}`);
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error for user ${userId}:`, error);
        });
    });

    logger.info('✅ Socket.io server initialized');
    return io;
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initializeSocket first.');
    }
    return io;
};

/**
 * Emit event to specific user
 * @param {number} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
        logger.debug(`Emitted ${event} to user ${userId}`);
    }
};

/**
 * Emit event to all users with specific role
 * @param {string} role - User role
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToRole = (role, event, data) => {
    if (io) {
        io.to(`role:${role}`).emit(event, data);
        logger.debug(`Emitted ${event} to role ${role}`);
    }
};

/**
 * Emit event to a room
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const emitToRoom = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
        logger.debug(`Emitted ${event} to room ${room}`);
    }
};

/**
 * Broadcast event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
        logger.debug(`Broadcasted ${event} to all clients`);
    }
};

/**
 * Check if user is connected
 * @param {number} userId - User ID
 * @returns {boolean}
 */
const isUserConnected = (userId) => {
    return connectedUsers.has(userId);
};

/**
 * Get count of connected users
 * @returns {number}
 */
const getConnectedUsersCount = () => {
    return connectedUsers.size;
};

module.exports = {
    initializeSocket,
    getIO,
    emitToUser,
    emitToRole,
    emitToRoom,
    broadcast,
    isUserConnected,
    getConnectedUsersCount
};
