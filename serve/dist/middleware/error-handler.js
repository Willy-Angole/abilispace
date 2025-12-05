"use strict";
/**
 * Error Handler Middleware
 *
 * Centralized error handling with proper HTTP status codes
 * and structured error responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.asyncHandler = asyncHandler;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const environment_1 = require("../config/environment");
/**
 * Custom application error class
 * Extends Error with HTTP status code and error code
 */
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Predefined error factories for common scenarios
 */
exports.Errors = {
    badRequest: (message, details) => new AppError(message, 400, 'BAD_REQUEST', details),
    unauthorized: (message = 'Authentication required') => new AppError(message, 401, 'UNAUTHORIZED'),
    forbidden: (message = 'Access denied') => new AppError(message, 403, 'FORBIDDEN'),
    notFound: (resource) => new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
    conflict: (message) => new AppError(message, 409, 'CONFLICT'),
    validation: (errors) => new AppError('Validation failed', 422, 'VALIDATION_ERROR', errors),
    internal: (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR'),
    serviceUnavailable: (message = 'Service temporarily unavailable') => new AppError(message, 503, 'SERVICE_UNAVAILABLE'),
};
/**
 * Format Zod validation errors into user-friendly format
 */
function formatZodErrors(error) {
    const errors = {};
    error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(err.message);
    });
    return errors;
}
/**
 * Global error handler middleware
 * Must be registered last in middleware chain
 */
function errorHandler(err, req, res, _next) {
    // Handle Zod validation errors
    if (err instanceof zod_1.ZodError) {
        const formattedErrors = formatZodErrors(err);
        res.status(422).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: formattedErrors,
        });
        return;
    }
    // Handle custom application errors
    if (err instanceof AppError) {
        // Log operational errors at warn level, programming errors at error level
        if (err.isOperational) {
            logger_1.logger.warn('Operational error:', {
                message: err.message,
                code: err.code,
                statusCode: err.statusCode,
                path: req.path,
                method: req.method,
            });
        }
        else {
            logger_1.logger.error('Programming error:', err);
        }
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(err.details ? { details: err.details } : {}),
            ...(environment_1.config.isDevelopment ? { stack: err.stack } : {}),
        });
        return;
    }
    // Handle unknown errors
    logger_1.logger.error('Unhandled error:', {
        error: err,
        path: req.path,
        method: req.method,
        body: req.body,
    });
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(environment_1.config.isDevelopment && {
            error: err.message,
            stack: err.stack,
        }),
    });
}
/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
function notFoundHandler(req, res, _next) {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        code: 'NOT_FOUND',
    });
}
/**
 * Async handler wrapper
 * Catches async errors and forwards to error handler
 *
 * @param fn - Async route handler function
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=error-handler.js.map