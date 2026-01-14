/**
 * Rate Limiter Middleware
 *
 * Implements token bucket algorithm for rate limiting.
 * Uses in-memory storage for simplicity (can be upgraded to Redis for distributed systems).
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Rate limiter middleware
 * Applies token bucket rate limiting to all requests
 */
export declare function rateLimiter(req: Request, res: Response, next: NextFunction): void;
/**
 * Create custom rate limiter with different limits
 * Factory function for endpoint-specific rate limiting
 */
export declare function createRateLimiter(maxRequests: number, windowMs: number): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Strict rate limiter for sensitive endpoints (login, password reset)
 * 5 requests per 15 minutes
 */
export declare const strictRateLimiter: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rate-limiter.d.ts.map