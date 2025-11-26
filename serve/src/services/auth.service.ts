/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and token management.
 * Implements secure authentication patterns following OWASP guidelines.
 * Supports both credential-based and Google OAuth authentication.
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { db } from '../database/pool';
import { hashPassword, verifyPassword, needsRehash } from '../utils/password';
import { generateTokenPair, createRefreshTokenData, hashToken, TokenPair } from '../utils/jwt';
import { logger } from '../utils/logger';
import { AppError, Errors } from '../middleware/error-handler';
import { RegisterInput, LoginInput } from '../utils/validators';
import { config } from '../config/environment';
import { emailService } from './email.service';
import crypto from 'crypto';

/**
 * Google OAuth token verification response
 */
interface GoogleTokenPayload {
    sub: string;         // Google user ID
    email: string;
    email_verified: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
}

/**
 * User entity interface
 */
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
    disabilityType?: string;
    accessibilityNeeds?: string;
    communicationPreference?: string;
    emergencyContact?: string;
    emailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Authentication response interface
 */
export interface AuthResponse {
    success: boolean;
    message: string;
    accessToken?: string;
    refreshToken?: string;
    user?: Omit<User, 'passwordHash'>;
}

/**
 * AuthService - Handles authentication operations
 * 
 * Design Pattern: Service Layer pattern
 * Separates business logic from controllers
 */
export class AuthService {
    /**
     * Register a new user
     * 
     * Time Complexity: O(1) for database operations
     * Space Complexity: O(1)
     * 
     * @param input - Registration data
     * @returns Authentication response with tokens
     */
    async register(input: RegisterInput): Promise<AuthResponse> {
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
            location,
            disabilityType,
            accessibilityNeeds,
            communicationPreference,
            emergencyContact,
        } = input;

        // Check if email already exists (case-insensitive)
        const existingUser = await db.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL',
            { values: [email] }
        );

        if (existingUser.rowCount && existingUser.rowCount > 0) {
            throw Errors.conflict('An account with this email already exists');
        }

        // Hash password using Argon2id
        const passwordHash = await hashPassword(password);

        // Create user in transaction
        const result = await db.transaction(async (client) => {
            // Insert user
            const userResult = await client.query<User>(
                `INSERT INTO users (
                    email, password_hash, first_name, last_name, phone, location,
                    disability_type, accessibility_needs, communication_preference,
                    emergency_contact
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt"`,
                [
                    email.toLowerCase(),
                    passwordHash,
                    firstName,
                    lastName,
                    phone || null,
                    location || null,
                    disabilityType || null,
                    accessibilityNeeds || null,
                    communicationPreference || 'email',
                    emergencyContact || null,
                ]
            );

            const user = userResult.rows[0];

            // Create default accessibility settings
            await client.query(
                'INSERT INTO user_accessibility_settings (user_id) VALUES ($1)',
                [user.id]
            );

            // Generate tokens
            const tokens = generateTokenPair(user.id, user.email, 'user');

            // Store refresh token hash
            const refreshTokenData = createRefreshTokenData(tokens.refreshToken);
            await client.query(
                `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3)`,
                [user.id, refreshTokenData.tokenHash, refreshTokenData.expiresAt]
            );

            return { user, tokens };
        });

        logger.info('User registered successfully', { userId: result.user.id });

        return {
            success: true,
            message: 'Registration successful',
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            user: result.user,
        };
    }

    /**
     * Authenticate user and generate tokens
     * 
     * @param input - Login credentials
     * @returns Authentication response with tokens
     */
    async login(input: LoginInput): Promise<AuthResponse> {
        const { email, password } = input;

        // Find user by email
        const result = await db.query<User & { password_hash: string }>(
            `SELECT id, email, password_hash, first_name as "firstName",
                    last_name as "lastName", phone, location,
                    disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt"
             FROM users
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
            { values: [email] }
        );

        if (result.rowCount === 0) {
            // Use generic message to prevent user enumeration
            throw Errors.unauthorized('Invalid email or password');
        }

        const user = result.rows[0];

        // Check if account is active
        if (!user.isActive) {
            throw Errors.forbidden('Your account has been deactivated');
        }

        // Verify password
        const isValidPassword = await verifyPassword(user.password_hash, password);

        if (!isValidPassword) {
            logger.warn('Failed login attempt', { email });
            throw Errors.unauthorized('Invalid email or password');
        }

        // Check if password needs rehashing (security upgrade)
        if (needsRehash(user.password_hash)) {
            const newHash = await hashPassword(password);
            await db.query(
                'UPDATE users SET password_hash = $1 WHERE id = $2',
                { values: [newHash, user.id] }
            );
            logger.info('Password rehashed for user', { userId: user.id });
        }

        // Generate new tokens
        const tokens = generateTokenPair(user.id, user.email, 'user');

        // Store refresh token
        const refreshTokenData = createRefreshTokenData(tokens.refreshToken);
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            { values: [user.id, refreshTokenData.tokenHash, refreshTokenData.expiresAt] }
        );

        // Update last login timestamp
        await db.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            { values: [user.id] }
        );

        // Remove sensitive data
        const { password_hash, ...safeUser } = user;

        logger.info('User logged in successfully', { userId: user.id });

        return {
            success: true,
            message: 'Login successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: safeUser,
        };
    }

    /**
     * Refresh access token using refresh token
     * 
     * @param refreshToken - Valid refresh token
     * @returns New token pair
     */
    async refreshToken(refreshToken: string): Promise<TokenPair> {
        const tokenHash = hashToken(refreshToken);

        // Find and validate refresh token
        const result = await db.query<{ user_id: string; expires_at: Date }>(
            `SELECT rt.user_id, rt.expires_at, u.email
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL`,
            { values: [tokenHash] }
        );

        if (result.rowCount === 0) {
            throw Errors.unauthorized('Invalid refresh token');
        }

        const tokenData = result.rows[0];

        // Check expiration
        if (new Date(tokenData.expires_at) < new Date()) {
            // Clean up expired token
            await db.query(
                'DELETE FROM refresh_tokens WHERE token_hash = $1',
                { values: [tokenHash] }
            );
            throw Errors.unauthorized('Refresh token has expired');
        }

        // Generate new tokens
        const newTokens = generateTokenPair(
            tokenData.user_id,
            (result.rows[0] as any).email,
            'user'
        );

        // Rotate refresh token (revoke old, create new)
        await db.transaction(async (client) => {
            // Revoke old token
            await client.query(
                'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
                [tokenHash]
            );

            // Store new refresh token
            const newRefreshTokenData = createRefreshTokenData(newTokens.refreshToken);
            await client.query(
                `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3)`,
                [tokenData.user_id, newRefreshTokenData.tokenHash, newRefreshTokenData.expiresAt]
            );
        });

        return newTokens;
    }

    /**
     * Logout user and revoke tokens
     * 
     * @param userId - User ID
     * @param refreshToken - Optional refresh token to revoke specific token
     */
    async logout(userId: string, refreshToken?: string): Promise<void> {
        if (refreshToken) {
            // Revoke specific token
            const tokenHash = hashToken(refreshToken);
            await db.query(
                'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND user_id = $2',
                { values: [tokenHash, userId] }
            );
        } else {
            // Revoke all tokens for user
            await db.query(
                'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL',
                { values: [userId] }
            );
        }

        logger.info('User logged out', { userId });
    }

    /**
     * Update user password
     * 
     * @param userId - User ID
     * @param currentPassword - Current password for verification
     * @param newPassword - New password
     */
    async updatePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        // Get current password hash
        const result = await db.query<{ password_hash: string }>(
            'SELECT password_hash FROM users WHERE id = $1',
            { values: [userId] }
        );

        if (result.rowCount === 0) {
            throw Errors.notFound('User');
        }

        // Verify current password
        const isValid = await verifyPassword(result.rows[0].password_hash, currentPassword);

        if (!isValid) {
            throw Errors.unauthorized('Current password is incorrect');
        }

        // Hash and save new password
        const newHash = await hashPassword(newPassword);
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            { values: [newHash, userId] }
        );

        // Revoke all refresh tokens (force re-authentication)
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1',
            { values: [userId] }
        );

        logger.info('Password updated', { userId });
    }

    /**
     * Clean up expired refresh tokens
     * Should be called periodically by a scheduled job
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await db.query(
            'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP OR revoked_at IS NOT NULL RETURNING id'
        );

        const deletedCount = result.rowCount || 0;
        logger.info(`Cleaned up ${deletedCount} expired refresh tokens`);

        return deletedCount;
    }

    /**
     * Verify Google ID token and extract user info
     * Uses Google's tokeninfo endpoint for server-side validation
     * 
     * @param idToken - Google ID token from client
     * @returns Verified Google user payload
     */
    private async verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
        try {
            // Verify token with Google's tokeninfo endpoint
            const response = await fetch(
                `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
            );

            if (!response.ok) {
                throw new Error('Invalid Google token');
            }

            const payload = await response.json() as GoogleTokenPayload & { aud: string };

            // Verify the token was issued for our app
            if (config.google.clientId && payload.aud !== config.google.clientId) {
                throw new Error('Token not issued for this application');
            }

            return payload;
        } catch (error) {
            logger.warn('Google token verification failed', { error });
            throw Errors.unauthorized('Invalid Google authentication');
        }
    }

    /**
     * Authenticate or register user via Google OAuth
     * Handles both sign-in and sign-up in a single flow
     * 
     * @param idToken - Google ID token
     * @param additionalInfo - Optional profile info for new users
     * @returns Authentication response with tokens
     */
    async googleAuth(
        idToken: string,
        additionalInfo?: {
            phone?: string;
            location?: string;
            disabilityType?: string;
            accessibilityNeeds?: string;
            communicationPreference?: string;
            emergencyContact?: string;
        }
    ): Promise<AuthResponse> {
        // Verify Google token
        const googleUser = await this.verifyGoogleToken(idToken);

        if (!googleUser.email_verified) {
            throw Errors.badRequest('Google email not verified');
        }

        // Check if user exists by Google ID
        let user = await this.findUserByGoogleId(googleUser.sub);

        // If no Google-linked account, check by email
        if (!user) {
            user = await this.findUserByEmail(googleUser.email);

            if (user) {
                // Link Google account to existing user
                await this.linkGoogleAccount(user.id, googleUser.sub, googleUser.picture);
                logger.info('Google account linked to existing user', { userId: user.id });
            }
        }

        // Create new user if none exists
        if (!user) {
            user = await this.createGoogleUser(googleUser, additionalInfo);
            logger.info('New user created via Google', { userId: user.id });
        }

        // Check if account is active
        if (!user.isActive) {
            throw Errors.forbidden('Your account has been deactivated');
        }

        // Generate tokens
        const tokens = generateTokenPair(user.id, user.email, 'user');

        // Store refresh token
        const refreshTokenData = createRefreshTokenData(tokens.refreshToken);
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            { values: [user.id, refreshTokenData.tokenHash, refreshTokenData.expiresAt] }
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            { values: [user.id] }
        );

        logger.info('User authenticated via Google', { userId: user.id });

        return {
            success: true,
            message: user.createdAt === user.updatedAt ? 'Account created successfully' : 'Login successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user,
        };
    }

    /**
     * Find user by Google ID
     */
    private async findUserByGoogleId(googleId: string): Promise<User | null> {
        const result = await db.query<User>(
            `SELECT id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM users
             WHERE google_id = $1 AND deleted_at IS NULL`,
            { values: [googleId] }
        );

        return result.rows[0] || null;
    }

    /**
     * Find user by email
     */
    private async findUserByEmail(email: string): Promise<User | null> {
        const result = await db.query<User>(
            `SELECT id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM users
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
            { values: [email] }
        );

        return result.rows[0] || null;
    }

    /**
     * Link Google account to existing user
     */
    private async linkGoogleAccount(
        userId: string,
        googleId: string,
        avatarUrl?: string
    ): Promise<void> {
        await db.query(
            `UPDATE users 
             SET google_id = $1, 
                 avatar_url = COALESCE(avatar_url, $2),
                 email_verified = true,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            { values: [googleId, avatarUrl || null, userId] }
        );
    }

    /**
     * Generate a secure 6-digit verification code
     */
    private generateVerificationCode(): string {
        // Generate random bytes and convert to 6-digit number
        const buffer = crypto.randomBytes(4);
        const num = buffer.readUInt32BE(0);
        // Ensure 6 digits (100000-999999)
        const code = (num % 900000) + 100000;
        return code.toString();
    }

    /**
     * Hash verification code for secure storage
     */
    private hashCode(code: string): string {
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    /**
     * Request password reset - sends verification code to email
     * 
     * @param email - User's email address
     * @returns Success message (always returns success to prevent enumeration)
     */
    async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
        // Always return success to prevent email enumeration attacks
        const successResponse = {
            success: true,
            message: 'If an account with this email exists, a reset code has been sent.',
        };

        // Find user by email
        const userResult = await db.query<{ id: string; first_name: string; email: string; google_id: string | null; password_hash: string | null }>(
            `SELECT id, first_name, email, google_id, password_hash 
             FROM users 
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
            { values: [email] }
        );

        if (userResult.rowCount === 0) {
            // User not found - return success anyway to prevent enumeration
            logger.info('Password reset requested for non-existent email', { 
                email: email.substring(0, 3) + '***' 
            });
            return successResponse;
        }

        const user = userResult.rows[0];

        // Check if user has password auth (not Google-only)
        if (!user.password_hash && user.google_id) {
            // User only has Google auth, but don't reveal this
            logger.info('Password reset requested for Google-only account', { 
                userId: user.id 
            });
            return successResponse;
        }

        // Invalidate any existing reset codes for this user
        await db.query(
            `UPDATE password_reset_codes 
             SET used_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1 AND used_at IS NULL`,
            { values: [user.id] }
        );

        // Generate new verification code
        const code = this.generateVerificationCode();
        const codeHash = this.hashCode(code);
        const expiryMinutes = config.passwordReset.codeExpiryMinutes;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        // Store hashed code in database
        await db.query(
            `INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
             VALUES ($1, $2, $3)`,
            { values: [user.id, codeHash, expiresAt] }
        );

        // Send email with code
        const emailSent = await emailService.sendPasswordResetCode(user.email, {
            recipientName: user.first_name,
            code,
            expiryMinutes,
        });

        if (!emailSent) {
            logger.error('Failed to send password reset email', { userId: user.id });
            // Still return success to prevent enumeration, but log the error
        }

        logger.info('Password reset code generated', { 
            userId: user.id,
            expiresAt 
        });

        return successResponse;
    }

    /**
     * Verify reset code without resetting password
     * Used to validate code before allowing password entry
     * 
     * @param email - User's email address
     * @param code - 6-digit verification code
     * @returns Success status
     */
    async verifyResetCode(
        email: string,
        code: string
    ): Promise<{ success: boolean; message: string }> {
        // Find user by email
        const userResult = await db.query<{ id: string }>(
            `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
            { values: [email] }
        );

        if (userResult.rowCount === 0) {
            throw Errors.badRequest('Invalid verification code');
        }

        const user = userResult.rows[0];
        const codeHash = this.hashCode(code);

        // Find valid reset code
        const codeResult = await db.query<{ id: string; attempts: number }>(
            `SELECT id, attempts 
             FROM password_reset_codes 
             WHERE user_id = $1 
               AND code_hash = $2 
               AND used_at IS NULL 
               AND expires_at > CURRENT_TIMESTAMP`,
            { values: [user.id, codeHash] }
        );

        if (codeResult.rowCount === 0) {
            // Check if code exists but was wrong (increment attempts)
            const existingCode = await db.query<{ id: string; attempts: number }>(
                `SELECT id, attempts 
                 FROM password_reset_codes 
                 WHERE user_id = $1 
                   AND used_at IS NULL 
                   AND expires_at > CURRENT_TIMESTAMP
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                { values: [user.id] }
            );

            if (existingCode.rowCount && existingCode.rowCount > 0) {
                const codeRecord = existingCode.rows[0];
                
                // Increment attempts
                await db.query(
                    'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1',
                    { values: [codeRecord.id] }
                );

                // Check if max attempts exceeded
                if (codeRecord.attempts >= 4) {
                    await db.query(
                        'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
                        { values: [codeRecord.id] }
                    );
                    throw Errors.badRequest('Too many invalid attempts. Please request a new code.');
                }
            }

            throw Errors.badRequest('Invalid or expired verification code');
        }

        logger.info('Reset code verified successfully', { userId: user.id });

        return {
            success: true,
            message: 'Code verified successfully',
        };
    }

    /**
     * Verify reset code and reset password
     * 
     * @param email - User's email address
     * @param code - 6-digit verification code
     * @param newPassword - New password
     * @returns Success status
     */
    async resetPassword(
        email: string,
        code: string,
        newPassword: string
    ): Promise<{ success: boolean; message: string }> {
        // Find user by email
        const userResult = await db.query<{ id: string; first_name: string; email: string }>(
            `SELECT id, first_name, email 
             FROM users 
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
            { values: [email] }
        );

        if (userResult.rowCount === 0) {
            throw Errors.badRequest('Invalid reset code');
        }

        const user = userResult.rows[0];
        const codeHash = this.hashCode(code);

        // Find valid reset code
        const codeResult = await db.query<{ id: string; attempts: number }>(
            `SELECT id, attempts 
             FROM password_reset_codes 
             WHERE user_id = $1 
               AND code_hash = $2 
               AND used_at IS NULL 
               AND expires_at > CURRENT_TIMESTAMP`,
            { values: [user.id, codeHash] }
        );

        if (codeResult.rowCount === 0) {
            // Check if code exists but was wrong (increment attempts)
            const existingCode = await db.query<{ id: string; attempts: number }>(
                `SELECT id, attempts 
                 FROM password_reset_codes 
                 WHERE user_id = $1 
                   AND used_at IS NULL 
                   AND expires_at > CURRENT_TIMESTAMP
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                { values: [user.id] }
            );

            if (existingCode.rowCount && existingCode.rowCount > 0) {
                const codeRecord = existingCode.rows[0];
                
                // Increment attempts
                await db.query(
                    'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1',
                    { values: [codeRecord.id] }
                );

                // Check if max attempts exceeded (will be invalidated by constraint)
                if (codeRecord.attempts >= 4) {
                    // Mark code as used (exceeded attempts)
                    await db.query(
                        'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
                        { values: [codeRecord.id] }
                    );
                    throw Errors.badRequest('Too many invalid attempts. Please request a new code.');
                }
            }

            throw Errors.badRequest('Invalid or expired reset code');
        }

        const resetCode = codeResult.rows[0];

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update password and mark code as used in transaction
        await db.transaction(async (client) => {
            // Update password
            await client.query(
                `UPDATE users 
                 SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2`,
                [passwordHash, user.id]
            );

            // Mark reset code as used
            await client.query(
                'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
                [resetCode.id]
            );

            // Revoke all refresh tokens (force re-authentication)
            await client.query(
                'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL',
                [user.id]
            );
        });

        // Send confirmation email
        await emailService.sendPasswordResetConfirmation(user.email, user.first_name);

        logger.info('Password reset successfully', { userId: user.id });

        return {
            success: true,
            message: 'Password has been reset successfully. You can now sign in with your new password.',
        };
    }

    /**
     * Clean up expired password reset codes
     * Should be called periodically by a scheduled job
     */
    async cleanupExpiredResetCodes(): Promise<number> {
        const result = await db.query(
            'DELETE FROM password_reset_codes WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL RETURNING id'
        );

        const deletedCount = result.rowCount || 0;
        logger.info(`Cleaned up ${deletedCount} expired password reset codes`);

        return deletedCount;
    }

    /**
     * Create new user from Google profile
     */
    private async createGoogleUser(
        googleUser: GoogleTokenPayload,
        additionalInfo?: {
            phone?: string;
            location?: string;
            disabilityType?: string;
            accessibilityNeeds?: string;
            communicationPreference?: string;
            emergencyContact?: string;
        }
    ): Promise<User> {
        const result = await db.transaction(async (client) => {
            // Insert user
            const userResult = await client.query<User>(
                `INSERT INTO users (
                    email, google_id, first_name, last_name, avatar_url,
                    email_verified, phone, location, disability_type,
                    accessibility_needs, communication_preference, emergency_contact
                ) VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11)
                RETURNING id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt", updated_at as "updatedAt"`,
                [
                    googleUser.email.toLowerCase(),
                    googleUser.sub,
                    googleUser.given_name || googleUser.name?.split(' ')[0] || 'User',
                    googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '',
                    googleUser.picture || null,
                    additionalInfo?.phone || null,
                    additionalInfo?.location || null,
                    additionalInfo?.disabilityType || null,
                    additionalInfo?.accessibilityNeeds || null,
                    additionalInfo?.communicationPreference || 'email',
                    additionalInfo?.emergencyContact || null,
                ]
            );

            const user = userResult.rows[0];

            // Create default accessibility settings
            await client.query(
                'INSERT INTO user_accessibility_settings (user_id) VALUES ($1)',
                [user.id]
            );

            return user;
        });

        return result;
    }
}

// Export singleton instance
export const authService = new AuthService();
