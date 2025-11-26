/**
 * Rate Limiter Middleware
 * 
 * Implements token bucket algorithm for rate limiting.
 * Uses in-memory storage for simplicity (can be upgraded to Redis for distributed systems).
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Token bucket entry for rate limiting
 */
interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

/**
 * In-memory store for rate limit buckets
 * Uses Map for O(1) lookup performance
 * 
 * Time Complexity: O(1) for get/set operations
 * Space Complexity: O(n) where n is number of unique clients
 */
class RateLimitStore {
    private buckets: Map<string, TokenBucket> = new Map();
    private readonly maxTokens: number;
    private readonly refillRate: number; // tokens per millisecond
    private readonly windowMs: number;

    constructor(maxRequests: number, windowMs: number) {
        this.maxTokens = maxRequests;
        this.windowMs = windowMs;
        this.refillRate = maxRequests / windowMs;

        // Periodic cleanup to prevent memory leaks
        setInterval(() => this.cleanup(), windowMs);
    }

    /**
     * Check if request should be allowed
     * Implements token bucket algorithm
     * 
     * @param key - Client identifier (IP address)
     * @returns Object with allowed status and remaining tokens
     */
    public consume(key: string): { allowed: boolean; remaining: number; resetAt: number } {
        const now = Date.now();
        let bucket = this.buckets.get(key);

        if (!bucket) {
            // New client - create full bucket
            bucket = {
                tokens: this.maxTokens - 1, // Consume one token
                lastRefill: now,
            };
            this.buckets.set(key, bucket);

            return {
                allowed: true,
                remaining: bucket.tokens,
                resetAt: now + this.windowMs,
            };
        }

        // Refill tokens based on time elapsed
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = timePassed * this.refillRate;
        bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        if (bucket.tokens >= 1) {
            // Allow request and consume token
            bucket.tokens -= 1;
            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens),
                resetAt: now + this.windowMs,
            };
        }

        // Rate limit exceeded
        return {
            allowed: false,
            remaining: 0,
            resetAt: now + Math.ceil((1 - bucket.tokens) / this.refillRate),
        };
    }

    /**
     * Remove expired buckets to free memory
     * Called periodically by cleanup interval
     */
    private cleanup(): void {
        const now = Date.now();
        const threshold = now - this.windowMs * 2;

        for (const [key, bucket] of this.buckets.entries()) {
            if (bucket.lastRefill < threshold && bucket.tokens >= this.maxTokens) {
                this.buckets.delete(key);
            }
        }

        logger.debug('Rate limit store cleanup', {
            activeBuckets: this.buckets.size,
        });
    }
}

// Initialize rate limit store
const store = new RateLimitStore(
    config.security.rateLimitMaxRequests,
    config.security.rateLimitWindowMs
);

/**
 * Get client identifier for rate limiting
 * Uses IP address with fallback options
 */
function getClientKey(req: Request): string {
    // Check for forwarded IP (behind proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
        return ips.trim();
    }

    // Direct connection IP
    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limiter middleware
 * Applies token bucket rate limiting to all requests
 */
export function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const clientKey = getClientKey(req);
    const result = store.consume(clientKey);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.security.rateLimitMaxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
            clientKey,
            path: req.path,
            method: req.method,
        });

        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        });
        return;
    }

    next();
}

/**
 * Create custom rate limiter with different limits
 * Factory function for endpoint-specific rate limiting
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
    const customStore = new RateLimitStore(maxRequests, windowMs);

    return (req: Request, res: Response, next: NextFunction): void => {
        const clientKey = getClientKey(req);
        const result = customStore.consume(clientKey);

        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

        if (!result.allowed) {
            res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later',
                code: 'RATE_LIMITED',
                retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
            });
            return;
        }

        next();
    };
}

/**
 * Strict rate limiter for sensitive endpoints (login, password reset)
 * 5 requests per 15 minutes
 */
export const strictRateLimiter = createRateLimiter(5, 15 * 60 * 1000);
