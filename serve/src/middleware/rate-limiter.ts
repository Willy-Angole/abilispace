/**
 * Rate Limiter Middleware
 *
 * Token bucket algorithm with optional Redis backend for multi-instance deploys.
 * Falls back to in-memory Map when REDIS_URL is not configured.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

let redisClient: RedisClientType | null = null;
let redisReady = false;

async function initRedis(): Promise<void> {
    if (!config.redis.url || redisClient) return;
    try {
        redisClient = createClient({ url: config.redis.url });
        redisClient.on('error', (err) => {
            logger.warn('Redis rate-limit client error', { err: String(err) });
            redisReady = false;
        });
        await redisClient.connect();
        redisReady = true;
        logger.info('Redis connected for rate limiting');
    } catch (error) {
        logger.warn('Redis unavailable; using in-memory rate limiting', { error });
        redisClient = null;
        redisReady = false;
    }
}

// Best-effort connect on module load
void initRedis();

class RateLimitStore {
    private buckets: Map<string, TokenBucket> = new Map();
    private readonly maxTokens: number;
    private readonly refillRate: number;
    private readonly windowMs: number;
    private readonly prefix: string;

    constructor(maxRequests: number, windowMs: number, prefix = 'rl') {
        this.maxTokens = maxRequests;
        this.windowMs = windowMs;
        this.refillRate = maxRequests / windowMs;
        this.prefix = prefix;

        setInterval(() => this.cleanup(), windowMs);
    }

    public async consume(
        key: string
    ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
        if (redisReady && redisClient) {
            return this.consumeRedis(key);
        }
        return this.consumeMemory(key);
    }

    private consumeMemory(key: string): {
        allowed: boolean;
        remaining: number;
        resetAt: number;
    } {
        const now = Date.now();
        let bucket = this.buckets.get(key);

        if (!bucket) {
            bucket = {
                tokens: this.maxTokens - 1,
                lastRefill: now,
            };
            this.buckets.set(key, bucket);
            return {
                allowed: true,
                remaining: bucket.tokens,
                resetAt: now + this.windowMs,
            };
        }

        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = timePassed * this.refillRate;
        bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return {
                allowed: true,
                remaining: Math.floor(bucket.tokens),
                resetAt: now + this.windowMs,
            };
        }

        return {
            allowed: false,
            remaining: 0,
            resetAt: now + Math.ceil((1 - bucket.tokens) / this.refillRate),
        };
    }

    /**
     * Fixed-window counter in Redis (simple, multi-instance safe)
     */
    private async consumeRedis(
        key: string
    ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
        const redisKey = `${this.prefix}:${key}`;
        const now = Date.now();
        try {
            const count = await redisClient!.incr(redisKey);
            if (count === 1) {
                await redisClient!.pExpire(redisKey, this.windowMs);
            }
            const ttl = await redisClient!.pTTL(redisKey);
            const resetAt = now + (ttl > 0 ? ttl : this.windowMs);
            const remaining = Math.max(0, this.maxTokens - count);
            return {
                allowed: count <= this.maxTokens,
                remaining,
                resetAt,
            };
        } catch (error) {
            logger.warn('Redis rate limit failed; falling back to memory', { error });
            return this.consumeMemory(key);
        }
    }

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

const store = new RateLimitStore(
    config.security.rateLimitMaxRequests,
    config.security.rateLimitWindowMs,
    'rl:global'
);

/**
 * Client key: prefer Express req.ip (respects trust proxy) over spoofable raw header alone.
 */
function getClientKey(req: Request): string {
    // req.ip is derived from socket / trusted proxy hops when trust proxy is set
    if (req.ip) {
        return req.ip;
    }
    return req.socket.remoteAddress || 'unknown';
}

export function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    void (async () => {
        const clientKey = getClientKey(req);
        const result = await store.consume(clientKey);

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
    })().catch(next);
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
    const customStore = new RateLimitStore(maxRequests, windowMs, `rl:${maxRequests}:${windowMs}`);

    return (req: Request, res: Response, next: NextFunction): void => {
        void (async () => {
            const clientKey = getClientKey(req);
            const result = await customStore.consume(clientKey);

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
        })().catch(next);
    };
}

/** Strict rate limiter for sensitive endpoints (login, password reset): 5 / 15 min */
export const strictRateLimiter = createRateLimiter(5, 15 * 60 * 1000);
