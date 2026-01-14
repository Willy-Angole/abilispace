"use strict";
/**
 * JWT Token Utility
 *
 * Handles JWT token generation, verification, and refresh token management.
 * Implements secure token practices following OWASP guidelines.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenPair = generateTokenPair;
exports.verifyAccessToken = verifyAccessToken;
exports.generateSecureToken = generateSecureToken;
exports.hashToken = hashToken;
exports.createRefreshTokenData = createRefreshTokenData;
exports.extractBearerToken = extractBearerToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const environment_1 = require("../config/environment");
const logger_1 = require("./logger");
/**
 * Generate access and refresh token pair
 *
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @param role - User's role (default: 'user')
 * @returns Token pair with expiration
 */
function generateTokenPair(userId, email, role = 'user') {
    // Create access token with Hasura claims
    const accessTokenPayload = {
        sub: userId,
        email,
        role,
        'https://hasura.io/jwt/claims': {
            'x-hasura-allowed-roles': [role, 'anonymous'],
            'x-hasura-default-role': role,
            'x-hasura-user-id': userId,
        },
    };
    const signOptions = {
        algorithm: 'HS256',
        expiresIn: environment_1.config.jwt.expiresIn,
        issuer: 'shiriki-api',
        audience: 'shiriki-client',
    };
    const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, environment_1.config.jwt.secret, signOptions);
    // Generate refresh token (opaque token for security)
    const refreshToken = generateSecureToken();
    // Calculate expiration time in seconds
    const expiresIn = parseTimeToSeconds(environment_1.config.jwt.expiresIn);
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
function verifyAccessToken(token) {
    try {
        const verifyOptions = {
            algorithms: ['HS256'],
            issuer: 'shiriki-api',
            audience: 'shiriki-client',
        };
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.config.jwt.secret, verifyOptions);
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            logger_1.logger.debug('Token expired');
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            logger_1.logger.debug('Invalid token');
        }
        else {
            logger_1.logger.error('Token verification error:', error);
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
function generateSecureToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('base64url');
}
/**
 * Hash a token for secure storage
 * Never store plain refresh tokens in database
 *
 * @param token - Token to hash
 * @returns SHA-256 hash of token
 */
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
/**
 * Create refresh token data for database storage
 *
 * @param token - Refresh token
 * @returns Object with hashed token and expiration
 */
function createRefreshTokenData(token) {
    const expiresInMs = parseTimeToSeconds(environment_1.config.jwt.refreshExpiresIn) * 1000;
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
function parseTimeToSeconds(timeStr) {
    const match = timeStr.match(/^(\d+)([dhms])$/);
    if (!match) {
        // Default to 1 hour if parsing fails
        return 3600;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = {
        'd': 86400, // days
        'h': 3600, // hours
        'm': 60, // minutes
        's': 1, // seconds
    };
    return value * (multipliers[unit] || 3600);
}
/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
function extractBearerToken(authHeader) {
    if (!authHeader)
        return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }
    return parts[1];
}
//# sourceMappingURL=jwt.js.map