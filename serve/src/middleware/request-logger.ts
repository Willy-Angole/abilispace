/**
 * Request Logger Middleware
 * 
 * Logs incoming HTTP requests with timing and response status.
 * Uses efficient string interpolation and avoids blocking operations.
 */

import { Request, Response, NextFunction } from 'express';
import { logger, createChildLogger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extended Request with request ID
 */
export interface LoggedRequest extends Request {
    requestId?: string;
    startTime?: number;
}

/**
 * Request logging middleware
 * Adds request ID and logs request/response details
 */
export function requestLogger(
    req: LoggedRequest,
    res: Response,
    next: NextFunction
): void {
    // Generate unique request ID
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.requestId = requestId;
    req.startTime = Date.now();

    // Set request ID in response headers
    res.setHeader('X-Request-ID', requestId);

    // Create child logger with request context
    const reqLogger = createChildLogger({ requestId });

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
export function conditionalRequestLogger(
    req: LoggedRequest,
    res: Response,
    next: NextFunction
): void {
    if (skipPaths.includes(req.path)) {
        return next();
    }

    return requestLogger(req, res, next);
}
