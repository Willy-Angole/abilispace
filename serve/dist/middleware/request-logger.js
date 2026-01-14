"use strict";
/**
 * Request Logger Middleware
 *
 * Logs incoming HTTP requests with timing and response status.
 * Uses efficient string interpolation and avoids blocking operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
exports.conditionalRequestLogger = conditionalRequestLogger;
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
/**
 * Request logging middleware
 * Adds request ID and logs request/response details
 */
function requestLogger(req, res, next) {
    // Generate unique request ID
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    req.requestId = requestId;
    req.startTime = Date.now();
    // Set request ID in response headers
    res.setHeader('X-Request-ID', requestId);
    // Create child logger with request context
    const reqLogger = (0, logger_1.createChildLogger)({ requestId });
    // Log incoming request
    reqLogger.info('Incoming request', {
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress,
    });
    // Capture response finish
    res.on('finish', () => {
        const duration = Date.now() - (req.startTime || Date.now());
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        reqLogger[logLevel]('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length'),
        });
    });
    next();
}
/**
 * Skip logging for specific paths (health checks, etc.)
 */
const skipPaths = ['/health', '/health/live', '/health/ready'];
/**
 * Conditional request logger
 * Skips logging for configured paths
 */
function conditionalRequestLogger(req, res, next) {
    if (skipPaths.includes(req.path)) {
        return next();
    }
    return requestLogger(req, res, next);
}
//# sourceMappingURL=request-logger.js.map