/**
 * Error Handler Middleware
 * 
 * Centralized error handling with proper HTTP status codes
 * and structured error responses.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

/**
 * Custom application error class
 * Extends Error with HTTP status code and error code
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: unknown
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        this.details = details;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Predefined error factories for common scenarios
 */
export const Errors = {
    badRequest: (message: string, details?: unknown) =>
        new AppError(message, 400, 'BAD_REQUEST', details),

    unauthorized: (message: string = 'Authentication required') =>
        new AppError(message, 401, 'UNAUTHORIZED'),

    forbidden: (message: string = 'Access denied') =>
        new AppError(message, 403, 'FORBIDDEN'),

    notFound: (resource: string) =>
        new AppError(`${resource} not found`, 404, 'NOT_FOUND'),

    conflict: (message: string) =>
        new AppError(message, 409, 'CONFLICT'),

    validation: (errors: unknown) =>
        new AppError('Validation failed', 422, 'VALIDATION_ERROR', errors),

    internal: (message: string = 'Internal server error') =>
        new AppError(message, 500, 'INTERNAL_ERROR'),

    serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
        new AppError(message, 503, 'SERVICE_UNAVAILABLE'),
};

/**
 * Format Zod validation errors into user-friendly format
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

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
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Handle Zod validation errors
    if (err instanceof ZodError) {
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
            logger.warn('Operational error:', {
                message: err.message,
                code: err.code,
                statusCode: err.statusCode,
                path: req.path,
                method: req.method,
            });
        } else {
            logger.error('Programming error:', err);
        }

        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(err.details ? { details: err.details } : {}),
            ...(config.isDevelopment ? { stack: err.stack } : {}),
        });
        return;
    }

    // Handle unknown errors
    logger.error('Unhandled error:', {
        error: err,
        path: req.path,
        method: req.method,
        body: req.body,
    });

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(config.isDevelopment && {
            error: err.message,
            stack: err.stack,
        }),
    });
}

/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
export function notFoundHandler(
    req: Request,
    res: Response,
    _next: NextFunction
): void {
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
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
