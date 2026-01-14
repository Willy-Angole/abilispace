"use strict";
/**
 * Logger Utility
 *
 * Structured logging using Winston with multiple transports.
 * Supports JSON format for production and colored console for development.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
const winston_1 = __importDefault(require("winston"));
const environment_1 = require("../config/environment");
const { combine, timestamp, printf, colorize, errors, json } = winston_1.default.format;
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
exports.logger = winston_1.default.createLogger({
    level: environment_1.config.logLevel,
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
    defaultMeta: { service: 'shiriki-api' },
    transports: [],
});
// Add appropriate transports based on environment
if (environment_1.config.isProduction) {
    // Production: JSON format for log aggregation
    exports.logger.add(new winston_1.default.transports.Console({
        format: combine(json()),
    }));
    // Add file transport for persistent logging
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: combine(json()),
    }));
    exports.logger.add(new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: combine(json()),
    }));
}
else {
    // Development: Colorized console output
    exports.logger.add(new winston_1.default.transports.Console({
        format: combine(colorize({ all: true }), devFormat),
    }));
}
/**
 * Create child logger with additional context
 * Useful for request-scoped logging
 */
function createChildLogger(context) {
    return exports.logger.child(context);
}
//# sourceMappingURL=logger.js.map