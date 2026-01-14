/**
 * Error Handler Middleware
 *
 * Centralized error handling with proper HTTP status codes
 * and structured error responses.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Custom application error class
 * Extends Error with HTTP status code and error code
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    readonly details?: unknown;
    constructor(message: string, statusCode?: number, code?: string, details?: unknown);
}
/**
 * Predefined error factories for common scenarios
 */
export declare const Errors: {
    badRequest: (message: string, details?: unknown) => AppError;
    unauthorized: (message?: string) => AppError;
    forbidden: (message?: string) => AppError;
    notFound: (resource: string) => AppError;
    conflict: (message: string) => AppError;
    validation: (errors: unknown) => AppError;
    internal: (message?: string) => AppError;
    serviceUnavailable: (message?: string) => AppError;
};
/**
 * Global error handler middleware
 * Must be registered last in middleware chain
 */
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
/**
 * 404 Not Found handler
 * Catches requests to undefined routes
 */
export declare function notFoundHandler(req: Request, res: Response, _next: NextFunction): void;
/**
 * Async handler wrapper
 * Catches async errors and forwards to error handler
 *
 * @param fn - Async route handler function
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error-handler.d.ts.map