"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const pool_1 = require("../database/pool");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../middleware/error-handler");
const environment_1 = require("../config/environment");
const email_service_1 = require("./email.service");
const crypto_1 = __importDefault(require("crypto"));
/**
 * AuthService - Handles authentication operations
 *
 * Design Pattern: Service Layer pattern
 * Separates business logic from controllers
 */
class AuthService {
    /**
     * Register a new user
     *
     * Time Complexity: O(1) for database operations
     * Space Complexity: O(1)
     *
     * @param input - Registration data
     * @returns Authentication response with tokens
     */
    async register(input) {
        const { email, password, firstName, lastName, phone, location, disabilityType, accessibilityNeeds, communicationPreference, emergencyContact, } = input;
        // Check if email already exists (case-insensitive)
        const existingUser = await pool_1.db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL', { values: [email] });
        if (existingUser.rowCount && existingUser.rowCount > 0) {
            throw error_handler_1.Errors.conflict('An account with this email already exists');
        }
        // Hash password using Argon2id
        const passwordHash = await (0, password_1.hashPassword)(password);
        // Create user in transaction
        const result = await pool_1.db.transaction(async (client) => {
            // Insert user
            const userResult = await client.query(`INSERT INTO users (
                    email, password_hash, first_name, last_name, phone, location,
                    disability_type, accessibility_needs, communication_preference,
                    emergency_contact
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt"`, [
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
            ]);
            const user = userResult.rows[0];
            // Create default accessibility settings
            await client.query('INSERT INTO user_accessibility_settings (user_id) VALUES ($1)', [user.id]);
            // Generate tokens
            const tokens = (0, jwt_1.generateTokenPair)(user.id, user.email, 'user');
            // Store refresh token hash
            const refreshTokenData = (0, jwt_1.createRefreshTokenData)(tokens.refreshToken);
            await client.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3)`, [user.id, refreshTokenData.tokenHash, refreshTokenData.expiresAt]);
            return { user, tokens };
        });
        logger_1.logger.info('User registered successfully', { userId: result.user.id });
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
    async login(input) {
        const { email, password } = input;
        // Find user by email
        const result = await pool_1.db.query(`SELECT id, email, password_hash, first_name as "firstName",
                    last_name as "lastName", phone, location,
                    disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt"
             FROM users
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`, { values: [email] });
        if (result.rowCount === 0) {
            // Use generic message to prevent user enumeration
            throw error_handler_1.Errors.unauthorized('Invalid email or password');
        }
        const user = result.rows[0];
        // Check if account is active
        if (!user.isActive) {
            throw error_handler_1.Errors.forbidden('Your account has been deactivated');
        }
        // Verify password
        const isValidPassword = await (0, password_1.verifyPassword)(user.password_hash, password);
        if (!isValidPassword) {
            logger_1.logger.warn('Failed login attempt', { email });
            throw error_handler_1.Errors.unauthorized('Invalid email or password');
        }
        // Check if password needs rehashing (security upgrade)
        if ((0, password_1.needsRehash)(user.password_hash)) {
            const newHash = await (0, password_1.hashPassword)(password);
            await pool_1.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', { values: [newHash, user.id] });
            logger_1.logger.info('Password rehashed for user', { userId: user.id });
        }
        // Generate new tokens
        const tokens = (0, jwt_1.generateTokenPair)(user.id, user.email, 'user');
        // Store refresh token
        const refreshTokenData = (0, jwt_1.createRefreshTokenData)(tokens.refreshToken);
        await pool_1.db.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`, { values: [user.id, refreshTokenData.tokenHash, refreshTokenData.expiresAt] });
        // Update last login timestamp
        await pool_1.db.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', { values: [user.id] });
        // Remove sensitive data
        const { password_hash, ...safeUser } = user;
        logger_1.logger.info('User logged in successfully', { userId: user.id });
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
    async refreshToken(refreshToken) {
        const tokenHash = (0, jwt_1.hashToken)(refreshToken);
        // Find and validate refresh token
        const result = await pool_1.db.query(`SELECT rt.user_id, rt.expires_at, u.email
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL`, { values: [tokenHash] });
        if (result.rowCount === 0) {
            throw error_handler_1.Errors.unauthorized('Invalid refresh token');
        }
        const tokenData = result.rows[0];
        // Check expiration
        if (new Date(tokenData.expires_at) < new Date()) {
            // Clean up expired token
            await pool_1.db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', { values: [tokenHash] });
            throw error_handler_1.Errors.unauthorized('Refresh token has expired');
        }
        // Generate new tokens
        const newTokens = (0, jwt_1.generateTokenPair)(tokenData.user_id, result.rows[0].email, 'user');
        // Rotate refresh token (revoke old, create new)
        await pool_1.db.transaction(async (client) => {
            // Revoke old token
            await client.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1', [tokenHash]);
            // Store new refresh token
            const newRefreshTokenData = (0, jwt_1.createRefreshTokenData)(newTokens.refreshToken);
            await client.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3)`, [tokenData.user_id, newRefreshTokenData.tokenHash, newRefreshTokenData.expiresAt]);
        });
        return newTokens;
    }
    /**
     * Logout user and revoke tokens
     *
     * @param userId - User ID
     * @param refreshToken - Optional refresh token to revoke specific token
     */
    async logout(userId, refreshToken) {
        if (refreshToken) {
            // Revoke specific token
            const tokenHash = (0, jwt_1.hashToken)(refreshToken);
            await pool_1.db.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND user_id = $2', { values: [tokenHash, userId] });
        }
        else {
            // Revoke all tokens for user
            await pool_1.db.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL', { values: [userId] });
        }
        logger_1.logger.info('User logged out', { userId });
    }
    /**
     * Update user password
     *
     * @param userId - User ID
     * @param currentPassword - Current password for verification
     * @param newPassword - New password
     */
    async updatePassword(userId, currentPassword, newPassword) {
        // Get current password hash
        const result = await pool_1.db.query('SELECT password_hash FROM users WHERE id = $1', { values: [userId] });
        if (result.rowCount === 0) {
            throw error_handler_1.Errors.notFound('User');
        }
        // Verify current password
        const isValid = await (0, password_1.verifyPassword)(result.rows[0].password_hash, currentPassword);
        if (!isValid) {
            throw error_handler_1.Errors.unauthorized('Current password is incorrect');
        }
        // Hash and save new password
        const newHash = await (0, password_1.hashPassword)(newPassword);
        await pool_1.db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', { values: [newHash, userId] });
        // Revoke all refresh tokens (force re-authentication)
        await pool_1.db.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1', { values: [userId] });
        logger_1.logger.info('Password updated', { userId });
    }
    /**
     * Clean up expired refresh tokens
     * Should be called periodically by a scheduled job
     */
    async cleanupExpiredTokens() {
        const result = await pool_1.db.query('DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP OR revoked_at IS NOT NULL RETURNING id');
        const deletedCount = result.rowCount || 0;
        logger_1.logger.info(`Cleaned up ${deletedCount} expired refresh tokens`);
        return deletedCount;
    }
    /**
     * Verify Google ID token and extract user info
     * Uses Google's tokeninfo endpoint for server-side validation
     *
     * @param idToken - Google ID token from client
     * @returns Verified Google user payload
     */
    async verifyGoogleToken(idToken) {
        try {
            // Log allowed client IDs for debugging
            logger_1.logger.debug('Google token verification starting', {
                allowedClientIds: environment_1.config.google.allowedClientIds,
                tokenLength: idToken?.length,
            });
            // Verify token with Google's tokeninfo endpoint
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
            if (!response.ok) {
                const errorText = await response.text();
                logger_1.logger.warn('Google tokeninfo endpoint rejected token', {
                    status: response.status,
                    error: errorText,
                });
                throw new Error('Invalid Google token');
            }
            const payload = await response.json();
            logger_1.logger.debug('Google token payload received', {
                aud: payload.aud,
                email: payload.email,
                email_verified: payload.email_verified,
            });
            // Verify the token was issued for our app
            if (environment_1.config.google.allowedClientIds.length > 0) {
                const isAllowedAud = environment_1.config.google.allowedClientIds.includes(payload.aud);
                if (!isAllowedAud) {
                    logger_1.logger.warn('Token audience mismatch', {
                        tokenAud: payload.aud,
                        allowedIds: environment_1.config.google.allowedClientIds,
                    });
                    throw new Error('Token not issued for this application');
                }
            }
            return payload;
        }
        catch (error) {
            logger_1.logger.error('Google token verification failed', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined
            });
            throw error_handler_1.Errors.unauthorized('Invalid Google authentication');
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
    async googleAuth(idToken, additionalInfo) {
        // Verify Google token
        const googleUser = await this.verifyGoogleToken(idToken);
        if (!googleUser.email_verified) {
            throw error_handler_1.Errors.badRequest('Google email not verified');
        }
        // Check if user exists by Google ID
        let user = await this.findUserByGoogleId(googleUser.sub);
        // If no Google-linked account, check by email
        if (!user) {
            user = await this.findUserByEmail(googleUser.email);
            if (user) {
                // Link Google account to existing user
                await this.linkGoogleAccount(user.id, googleUser.sub, googleUser.picture);
                logger_1.logger.info('Google account linked to existing user', { userId: user.id });
            }
        }
        // Create new user if none exists
        if (!user) {
            user = await this.createGoogleUser(googleUser, additionalInfo);
            logger_1.logger.info('New user created via Google', { userId: user.id });
        }
        // Check if account is active
        if (!user.isActive) {
            throw error_handler_1.Errors.forbidden('Your account has been deactivated');
        }
        // Generate tokens
        const tokens = (0, jwt_1.generateTokenPair)(user.id, user.email, 'user');
        // Store refresh token
        const refreshTokenData = (0, jwt_1.createRefreshTokenData)(tokens.refreshToken);
        await pool_1.db.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)`, { values: [user.id, refreshTokenData.tokenHash, refreshTokenData.expiresAt] });
        // Update last login
        await pool_1.db.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', { values: [user.id] });
        logger_1.logger.info('User authenticated via Google', { userId: user.id });
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
    async findUserByGoogleId(googleId) {
        const result = await pool_1.db.query(`SELECT id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM users
             WHERE google_id = $1 AND deleted_at IS NULL`, { values: [googleId] });
        return result.rows[0] || null;
    }
    /**
     * Find user by email
     */
    async findUserByEmail(email) {
        const result = await pool_1.db.query(`SELECT id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM users
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`, { values: [email] });
        return result.rows[0] || null;
    }
    /**
     * Link Google account to existing user
     */
    async linkGoogleAccount(userId, googleId, avatarUrl) {
        await pool_1.db.query(`UPDATE users 
             SET google_id = $1, 
                 avatar_url = COALESCE(avatar_url, $2),
                 email_verified = true,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`, { values: [googleId, avatarUrl || null, userId] });
    }
    /**
     * Generate a secure 6-digit verification code
     */
    generateVerificationCode() {
        // Generate random bytes and convert to 6-digit number
        const buffer = crypto_1.default.randomBytes(4);
        const num = buffer.readUInt32BE(0);
        // Ensure 6 digits (100000-999999)
        const code = (num % 900000) + 100000;
        return code.toString();
    }
    /**
     * Hash verification code for secure storage
     */
    hashCode(code) {
        return crypto_1.default.createHash('sha256').update(code).digest('hex');
    }
    /**
     * Request password reset - sends verification code to email
     *
     * @param email - User's email address
     * @returns Success message (always returns success to prevent enumeration)
     */
    async requestPasswordReset(email) {
        // Always return success to prevent email enumeration attacks
        const successResponse = {
            success: true,
            message: 'If an account with this email exists, a reset code has been sent.',
        };
        // Find user by email
        const userResult = await pool_1.db.query(`SELECT id, first_name, email, google_id, password_hash 
             FROM users 
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`, { values: [email] });
        if (userResult.rowCount === 0) {
            // User not found - return success anyway to prevent enumeration
            logger_1.logger.info('Password reset requested for non-existent email', {
                email: email.substring(0, 3) + '***'
            });
            return successResponse;
        }
        const user = userResult.rows[0];
        // Check if user has password auth (not Google-only)
        if (!user.password_hash && user.google_id) {
            // User only has Google auth, but don't reveal this
            logger_1.logger.info('Password reset requested for Google-only account', {
                userId: user.id
            });
            return successResponse;
        }
        // Invalidate any existing reset codes for this user
        await pool_1.db.query(`UPDATE password_reset_codes 
             SET used_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1 AND used_at IS NULL`, { values: [user.id] });
        // Generate new verification code
        const code = this.generateVerificationCode();
        const codeHash = this.hashCode(code);
        const expiryMinutes = environment_1.config.passwordReset.codeExpiryMinutes;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
        // Store hashed code in database
        await pool_1.db.query(`INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
             VALUES ($1, $2, $3)`, { values: [user.id, codeHash, expiresAt] });
        // Send email with code
        const emailSent = await email_service_1.emailService.sendPasswordResetCode(user.email, {
            recipientName: user.first_name,
            code,
            expiryMinutes,
        });
        if (!emailSent) {
            logger_1.logger.error('Failed to send password reset email', { userId: user.id });
            // Still return success to prevent enumeration, but log the error
        }
        logger_1.logger.info('Password reset code generated', {
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
    async verifyResetCode(email, code) {
        // Find user by email
        const userResult = await pool_1.db.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`, { values: [email] });
        if (userResult.rowCount === 0) {
            throw error_handler_1.Errors.badRequest('Invalid verification code');
        }
        const user = userResult.rows[0];
        const codeHash = this.hashCode(code);
        // Find valid reset code
        const codeResult = await pool_1.db.query(`SELECT id, attempts 
             FROM password_reset_codes 
             WHERE user_id = $1 
               AND code_hash = $2 
               AND used_at IS NULL 
               AND expires_at > CURRENT_TIMESTAMP`, { values: [user.id, codeHash] });
        if (codeResult.rowCount === 0) {
            // Check if code exists but was wrong (increment attempts)
            const existingCode = await pool_1.db.query(`SELECT id, attempts 
                 FROM password_reset_codes 
                 WHERE user_id = $1 
                   AND used_at IS NULL 
                   AND expires_at > CURRENT_TIMESTAMP
                 ORDER BY created_at DESC 
                 LIMIT 1`, { values: [user.id] });
            if (existingCode.rowCount && existingCode.rowCount > 0) {
                const codeRecord = existingCode.rows[0];
                // Increment attempts
                await pool_1.db.query('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1', { values: [codeRecord.id] });
                // Check if max attempts exceeded
                if (codeRecord.attempts >= 4) {
                    await pool_1.db.query('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', { values: [codeRecord.id] });
                    throw error_handler_1.Errors.badRequest('Too many invalid attempts. Please request a new code.');
                }
            }
            throw error_handler_1.Errors.badRequest('Invalid or expired verification code');
        }
        logger_1.logger.info('Reset code verified successfully', { userId: user.id });
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
    async resetPassword(email, code, newPassword) {
        // Find user by email
        const userResult = await pool_1.db.query(`SELECT id, first_name, email 
             FROM users 
             WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`, { values: [email] });
        if (userResult.rowCount === 0) {
            throw error_handler_1.Errors.badRequest('Invalid reset code');
        }
        const user = userResult.rows[0];
        const codeHash = this.hashCode(code);
        // Find valid reset code
        const codeResult = await pool_1.db.query(`SELECT id, attempts 
             FROM password_reset_codes 
             WHERE user_id = $1 
               AND code_hash = $2 
               AND used_at IS NULL 
               AND expires_at > CURRENT_TIMESTAMP`, { values: [user.id, codeHash] });
        if (codeResult.rowCount === 0) {
            // Check if code exists but was wrong (increment attempts)
            const existingCode = await pool_1.db.query(`SELECT id, attempts 
                 FROM password_reset_codes 
                 WHERE user_id = $1 
                   AND used_at IS NULL 
                   AND expires_at > CURRENT_TIMESTAMP
                 ORDER BY created_at DESC 
                 LIMIT 1`, { values: [user.id] });
            if (existingCode.rowCount && existingCode.rowCount > 0) {
                const codeRecord = existingCode.rows[0];
                // Increment attempts
                await pool_1.db.query('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1', { values: [codeRecord.id] });
                // Check if max attempts exceeded (will be invalidated by constraint)
                if (codeRecord.attempts >= 4) {
                    // Mark code as used (exceeded attempts)
                    await pool_1.db.query('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', { values: [codeRecord.id] });
                    throw error_handler_1.Errors.badRequest('Too many invalid attempts. Please request a new code.');
                }
            }
            throw error_handler_1.Errors.badRequest('Invalid or expired reset code');
        }
        const resetCode = codeResult.rows[0];
        // Hash new password
        const passwordHash = await (0, password_1.hashPassword)(newPassword);
        // Update password and mark code as used in transaction
        await pool_1.db.transaction(async (client) => {
            // Update password
            await client.query(`UPDATE users 
                 SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2`, [passwordHash, user.id]);
            // Mark reset code as used
            await client.query('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetCode.id]);
            // Revoke all refresh tokens (force re-authentication)
            await client.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL', [user.id]);
        });
        // Send confirmation email
        await email_service_1.emailService.sendPasswordResetConfirmation(user.email, user.first_name);
        logger_1.logger.info('Password reset successfully', { userId: user.id });
        return {
            success: true,
            message: 'Password has been reset successfully. You can now sign in with your new password.',
        };
    }
    /**
     * Clean up expired password reset codes
     * Should be called periodically by a scheduled job
     */
    async cleanupExpiredResetCodes() {
        const result = await pool_1.db.query('DELETE FROM password_reset_codes WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL RETURNING id');
        const deletedCount = result.rowCount || 0;
        logger_1.logger.info(`Cleaned up ${deletedCount} expired password reset codes`);
        return deletedCount;
    }
    /**
     * Create new user from Google profile
     */
    async createGoogleUser(googleUser, additionalInfo) {
        const result = await pool_1.db.transaction(async (client) => {
            // Insert user
            const userResult = await client.query(`INSERT INTO users (
                    email, google_id, first_name, last_name, avatar_url,
                    email_verified, phone, location, disability_type,
                    accessibility_needs, communication_preference, emergency_contact
                ) VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11)
                RETURNING id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified", is_active as "isActive",
                    created_at as "createdAt", updated_at as "updatedAt"`, [
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
            ]);
            const user = userResult.rows[0];
            // Create default accessibility settings
            await client.query('INSERT INTO user_accessibility_settings (user_id) VALUES ($1)', [user.id]);
            return user;
        });
        return result;
    }
}
exports.AuthService = AuthService;
// Export singleton instance
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map