/**
 * Request Logger Middleware
 *
 * Logs incoming HTTP requests with timing and response status.
 * Uses efficient string interpolation and avoids blocking operations.
 */
import { Request, Response, NextFunction } from 'express';
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
export declare function requestLogger(req: LoggedRequest, res: Response, next: NextFunction): void;
/**
 * Conditional request logger
 * Skips logging for configured paths
 */
export declare function conditionalRequestLogger(req: LoggedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=request-logger.d.ts.map