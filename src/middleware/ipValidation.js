/**
 * IP Validation Middleware
 * Validates that attendance requests come from campus IP ranges
 */
const logger = require('../utils/logger');

// Campus IP ranges configuration
// Can be overridden via environment variable CAMPUS_IP_RANGES
const getCampusIPRanges = () => {
    const envRanges = process.env.CAMPUS_IP_RANGES;
    if (envRanges) {
        return envRanges.split(',').map(range => range.trim());
    }

    // Default campus IP ranges (examples - configure for your institution)
    return [
        '10.0.0.0/8',       // Private network range
        '172.16.0.0/12',    // Private network range
        '192.168.0.0/16',   // Private network range
        '127.0.0.1',        // Localhost (for development)
        '::1',              // IPv6 localhost
    ];
};

/**
 * Check if an IP address is within a CIDR range
 * @param {string} ip - IP address to check
 * @param {string} cidr - CIDR notation (e.g., "192.168.1.0/24")
 * @returns {boolean}
 */
const isIPInCIDR = (ip, cidr) => {
    // Handle exact IP match
    if (!cidr.includes('/')) {
        return ip === cidr;
    }

    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    // Convert IP to number
    const ipToNum = (ipStr) => {
        const parts = ipStr.split('.');
        if (parts.length !== 4) return null;
        return parts.reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0;
    };

    const ipNum = ipToNum(ip);
    const rangeNum = ipToNum(range);

    if (ipNum === null || rangeNum === null) return false;

    const maskNum = ~((1 << (32 - mask)) - 1) >>> 0;
    return (ipNum & maskNum) === (rangeNum & maskNum);
};

/**
 * Extract client IP from request
 * Handles proxies and various header formats
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
const getClientIP = (req) => {
    // Check X-Forwarded-For header (common with proxies/load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // Take the first IP in the chain (original client)
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0];
    }

    // Check X-Real-IP header (nginx)
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }

    // Check CF-Connecting-IP header (Cloudflare)
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) {
        return cfIP;
    }

    // Fall back to socket remote address
    let ip = req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip;

    // Handle IPv6-mapped IPv4 addresses (::ffff:192.168.1.1)
    if (ip && ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    return ip || 'unknown';
};

/**
 * Check if IP is from campus network
 * @param {string} ip - IP address to check
 * @returns {boolean}
 */
const isCampusIP = (ip) => {
    // Skip validation if disabled
    if (process.env.SKIP_IP_VALIDATION === 'true') {
        return true;
    }

    const campusRanges = getCampusIPRanges();

    for (const range of campusRanges) {
        if (isIPInCIDR(ip, range)) {
            return true;
        }
    }

    return false;
};

/**
 * Middleware to validate campus IP for attendance
 * Only blocks non-campus IPs, doesn't throw error for other requests
 */
const validateCampusIP = (req, res, next) => {
    const clientIP = getClientIP(req);

    // Attach IP to request for logging
    req.clientIP = clientIP;

    const isValid = isCampusIP(clientIP);

    if (!isValid) {
        logger.warn(`Attendance attempt from non-campus IP: ${clientIP}`);
        return res.status(403).json({
            success: false,
            message: 'Yoklama sadece kampüs ağından verilebilir. Lütfen üniversite WiFi ağına bağlanın.',
            code: 'NON_CAMPUS_IP',
            clientIP: clientIP,
        });
    }

    logger.info(`Campus IP validated: ${clientIP}`);
    next();
};

/**
 * Middleware to log IP without blocking (for non-critical endpoints)
 */
const logClientIP = (req, res, next) => {
    req.clientIP = getClientIP(req);
    next();
};

module.exports = {
    validateCampusIP,
    logClientIP,
    getClientIP,
    isCampusIP,
    getCampusIPRanges,
};
