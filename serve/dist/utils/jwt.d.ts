/**
 * JWT Token Utility
 *
 * Handles JWT token generation, verification, and refresh token management.
 * Implements secure token practices following OWASP guidelines.
 */
import { JwtPayload } from 'jsonwebtoken';
/**
 * Token payload interface
 * Contains claims for Hasura authorization
 */
export interface TokenPayload extends JwtPayload {
    sub: string;
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
export declare function generateTokenPair(userId: string, email: string, role?: string): TokenPair;
/**
 * Verify and decode an access token
 *
 * @param token - JWT access token
 * @returns Decoded token payload or null if invalid
 */
export declare function verifyAccessToken(token: string): TokenPayload | null;
/**
 * Generate a cryptographically secure random token
 * Used for refresh tokens and password reset tokens
 *
 * @param length - Token length in bytes (default: 32)
 * @returns Base64url encoded token string
 */
export declare function generateSecureToken(length?: number): string;
/**
 * Hash a token for secure storage
 * Never store plain refresh tokens in database
 *
 * @param token - Token to hash
 * @returns SHA-256 hash of token
 */
export declare function hashToken(token: string): string;
/**
 * Create refresh token data for database storage
 *
 * @param token - Refresh token
 * @returns Object with hashed token and expiration
 */
export declare function createRefreshTokenData(token: string): RefreshTokenData;
/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export declare function extractBearerToken(authHeader: string | undefined): string | null;
//# sourceMappingURL=jwt.d.ts.map