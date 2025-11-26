/**
 * JWT Token Utility
 * 
 * Handles JWT token generation, verification, and refresh token management.
 * Implements secure token practices following OWASP guidelines.
 */

import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config/environment';
import { logger } from './logger';

/**
 * Token payload interface
 * Contains claims for Hasura authorization
 */
export interface TokenPayload extends JwtPayload {
    sub: string;                    // User ID
    email: string;
    role: string;
    'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': string[];
        'x-hasura-default-role': string;
        'x-hasura-user-id': string;
    };
}

/**
 * Token pair response
 */
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

/**
 * Refresh token data for storage
 */
export interface RefreshTokenData {
    tokenHash: string;
    expiresAt: Date;
}

/**
 * Generate access and refresh token pair
 * 
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @param role - User's role (default: 'user')
 * @returns Token pair with expiration
 */
export function generateTokenPair(
    userId: string,
    email: string,
    role: string = 'user'
): TokenPair {
    // Create access token with Hasura claims
    const accessTokenPayload: TokenPayload = {
        sub: userId,
        email,
        role,
        'https://hasura.io/jwt/claims': {
            'x-hasura-allowed-roles': [role, 'anonymous'],
            'x-hasura-default-role': role,
            'x-hasura-user-id': userId,
        },
    };

    const signOptions: SignOptions = {
        algorithm: 'HS256',
        expiresIn: config.jwt.expiresIn as `${number}d` | `${number}h` | `${number}m` | `${number}s`,
        issuer: 'shiriki-api',
        audience: 'shiriki-client',
    };

    const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, signOptions);

    // Generate refresh token (opaque token for security)
    const refreshToken = generateSecureToken();

    // Calculate expiration time in seconds
    const expiresIn = parseTimeToSeconds(config.jwt.expiresIn);

    return {
        accessToken,
        refreshToken,
        expiresIn,
    };
}

/**
 * Verify and decode an access token
 * 
 * @param token - JWT access token
 * @returns Decoded token payload or null if invalid
 */
export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        const verifyOptions: VerifyOptions = {
            algorithms: ['HS256'],
            issuer: 'shiriki-api',
            audience: 'shiriki-client',
        };

        const decoded = jwt.verify(token, config.jwt.secret, verifyOptions) as TokenPayload;
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logger.debug('Token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            logger.debug('Invalid token');
        } else {
            logger.error('Token verification error:', error);
        }
        return null;
    }
}

/**
 * Generate a cryptographically secure random token
 * Used for refresh tokens and password reset tokens
 * 
 * @param length - Token length in bytes (default: 32)
 * @returns Base64url encoded token string
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash a token for secure storage
 * Never store plain refresh tokens in database
 * 
 * @param token - Token to hash
 * @returns SHA-256 hash of token
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create refresh token data for database storage
 * 
 * @param token - Refresh token
 * @returns Object with hashed token and expiration
 */
export function createRefreshTokenData(token: string): RefreshTokenData {
    const expiresInMs = parseTimeToSeconds(config.jwt.refreshExpiresIn) * 1000;
    
    return {
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + expiresInMs),
    };
}

/**
 * Parse time string to seconds
 * Supports formats like '7d', '24h', '30m', '60s'
 * 
 * @param timeStr - Time string
 * @returns Time in seconds
 */
function parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([dhms])$/);
    
    if (!match) {
        // Default to 1 hour if parsing fails
        return 3600;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
        'd': 86400,  // days
        'h': 3600,   // hours
        'm': 60,     // minutes
        's': 1,      // seconds
    };

    return value * (multipliers[unit] || 3600);
}

/**
 * Extract token from Authorization header
 * 
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }
    
    return parts[1];
}
