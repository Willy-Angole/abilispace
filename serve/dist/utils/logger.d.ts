/**
 * Logger Utility
 *
 * Structured logging using Winston with multiple transports.
 * Supports JSON format for production and colored console for development.
 */
import winston from 'winston';
/**
 * Create Winston logger instance
 */
export declare const logger: winston.Logger;
/**
 * Create child logger with additional context
 * Useful for request-scoped logging
 */
export declare function createChildLogger(context: Record<string, unknown>): winston.Logger;
//# sourceMappingURL=logger.d.ts.map