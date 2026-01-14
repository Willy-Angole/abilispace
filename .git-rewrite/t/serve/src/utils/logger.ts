/**
 * Logger Utility
 * 
 * Structured logging using Winston with multiple transports.
 * Supports JSON format for production and colored console for development.
 */

import winston from 'winston';
import { config } from '../config/environment';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Custom format for development console output
 */
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
        log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
});

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
    level: config.logLevel,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
    ),
    defaultMeta: { service: 'shiriki-api' },
    transports: [],
});

// Add appropriate transports based on environment
if (config.isProduction) {
    // Production: JSON format for log aggregation
    logger.add(new winston.transports.Console({
        format: combine(json()),
    }));
    
    // Add file transport for persistent logging
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: combine(json()),
    }));
    
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        format: combine(json()),
    }));
} else {
    // Development: Colorized console output
    logger.add(new winston.transports.Console({
        format: combine(
            colorize({ all: true }),
            devFormat
        ),
    }));
}

/**
 * Create child logger with additional context
 * Useful for request-scoped logging
 */
export function createChildLogger(context: Record<string, unknown>) {
    return logger.child(context);
}
