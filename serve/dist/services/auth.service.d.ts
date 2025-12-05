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
import { TokenPair } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../utils/validators';
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
export declare class AuthService {
    /**
     * Register a new user
     *
     * Time Complexity: O(1) for database operations
     * Space Complexity: O(1)
     *
     * @param input - Registration data
     * @returns Authentication response with tokens
     */
    register(input: RegisterInput): Promise<AuthResponse>;
    /**
     * Authenticate user and generate tokens
     *
     * @param input - Login credentials
     * @returns Authentication response with tokens
     */
    login(input: LoginInput): Promise<AuthResponse>;
    /**
     * Refresh access token using refresh token
     *
     * @param refreshToken - Valid refresh token
     * @returns New token pair
     */
    refreshToken(refreshToken: string): Promise<TokenPair>;
    /**
     * Logout user and revoke tokens
     *
     * @param userId - User ID
     * @param refreshToken - Optional refresh token to revoke specific token
     */
    logout(userId: string, refreshToken?: string): Promise<void>;
    /**
     * Update user password
     *
     * @param userId - User ID
     * @param currentPassword - Current password for verification
     * @param newPassword - New password
     */
    updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    /**
     * Clean up expired refresh tokens
     * Should be called periodically by a scheduled job
     */
    cleanupExpiredTokens(): Promise<number>;
    /**
     * Verify Google ID token and extract user info
     * Uses Google's tokeninfo endpoint for server-side validation
     *
     * @param idToken - Google ID token from client
     * @returns Verified Google user payload
     */
    private verifyGoogleToken;
    /**
     * Authenticate or register user via Google OAuth
     * Handles both sign-in and sign-up in a single flow
     *
     * @param idToken - Google ID token
     * @param additionalInfo - Optional profile info for new users
     * @returns Authentication response with tokens
     */
    googleAuth(idToken: string, additionalInfo?: {
        phone?: string;
        location?: string;
        disabilityType?: string;
        accessibilityNeeds?: string;
        communicationPreference?: string;
        emergencyContact?: string;
    }): Promise<AuthResponse>;
    /**
     * Find user by Google ID
     */
    private findUserByGoogleId;
    /**
     * Find user by email
     */
    private findUserByEmail;
    /**
     * Link Google account to existing user
     */
    private linkGoogleAccount;
    /**
     * Generate a secure 6-digit verification code
     */
    private generateVerificationCode;
    /**
     * Hash verification code for secure storage
     */
    private hashCode;
    /**
     * Request password reset - sends verification code to email
     *
     * @param email - User's email address
     * @returns Success message (always returns success to prevent enumeration)
     */
    requestPasswordReset(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Verify reset code without resetting password
     * Used to validate code before allowing password entry
     *
     * @param email - User's email address
     * @param code - 6-digit verification code
     * @returns Success status
     */
    verifyResetCode(email: string, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Verify reset code and reset password
     *
     * @param email - User's email address
     * @param code - 6-digit verification code
     * @param newPassword - New password
     * @returns Success status
     */
    resetPassword(email: string, code: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Clean up expired password reset codes
     * Should be called periodically by a scheduled job
     */
    cleanupExpiredResetCodes(): Promise<number>;
    /**
     * Create new user from Google profile
     */
    private createGoogleUser;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map