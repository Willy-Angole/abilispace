"use strict";
/**
 * Authentication Routes
 *
 * Handles user registration, login, logout, and token management.
 * Supports both credential-based and Google OAuth authentication.
 * Implements rate limiting on sensitive endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
const rate_limiter_1 = require("../middleware/rate-limiter");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
// Google OAuth validation schema
const googleAuthSchema = zod_1.z.object({
    idToken: zod_1.z.string().min(1, 'Google ID token is required'),
    additionalInfo: zod_1.z.object({
        phone: zod_1.z.string().optional(),
        location: zod_1.z.string().optional(),
        disabilityType: zod_1.z.string().optional(),
        accessibilityNeeds: zod_1.z.string().optional(),
        communicationPreference: zod_1.z.string().optional(),
        emergencyContact: zod_1.z.string().optional(),
    }).optional(),
});
/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', rate_limiter_1.strictRateLimiter, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.registerSchema.parse(req.body);
    const result = await auth_service_1.authService.register(input);
    res.status(201).json(result);
}));
/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', rate_limiter_1.strictRateLimiter, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.loginSchema.parse(req.body);
    const result = await auth_service_1.authService.login(input);
    res.json(result);
}));
/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = validators_1.refreshTokenSchema.parse(req.body);
    const tokens = await auth_service_1.authService.refreshToken(refreshToken);
    res.json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
    });
}));
/**
 * POST /api/auth/logout
 * Logout user and revoke tokens
 */
router.post('/logout', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const refreshToken = req.body.refreshToken;
    await auth_service_1.authService.logout(req.userId, refreshToken);
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
}));
/**
 * POST /api/auth/update-password
 * Update user password (requires authentication)
 */
router.post('/update-password', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { currentPassword, newPassword } = validators_1.updatePasswordSchema.parse(req.body);
    await auth_service_1.authService.updatePassword(req.userId, currentPassword, newPassword);
    res.json({
        success: true,
        message: 'Password updated successfully',
    });
}));
/**
 * POST /api/auth/request-reset
 * Request password reset email
 */
router.post('/request-reset', rate_limiter_1.strictRateLimiter, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { email } = validators_1.requestPasswordResetSchema.parse(req.body);
    const result = await auth_service_1.authService.requestPasswordReset(email);
    res.json(result);
}));
/**
 * POST /api/auth/verify-reset-code
 * Verify password reset code without resetting password
 */
router.post('/verify-reset-code', rate_limiter_1.strictRateLimiter, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { email, code } = validators_1.verifyResetCodeSchema.parse(req.body);
    const result = await auth_service_1.authService.verifyResetCode(email, code);
    res.json(result);
}));
/**
 * POST /api/auth/reset-password
 * Reset password using verification code
 */
router.post('/reset-password', rate_limiter_1.strictRateLimiter, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { email, code, newPassword } = validators_1.resetPasswordSchema.parse(req.body);
    const result = await auth_service_1.authService.resetPassword(email, code, newPassword);
    res.json(result);
}));
/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user?.sub,
            email: req.user?.email,
            role: req.user?.role,
        },
    });
}));
/**
 * POST /api/auth/google
 * Authenticate or register via Google OAuth
 * Handles both sign-in and sign-up flows
 */
router.post('/google', rate_limiter_1.strictRateLimiter, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { idToken, additionalInfo } = googleAuthSchema.parse(req.body);
    const result = await auth_service_1.authService.googleAuth(idToken, additionalInfo);
    res.json(result);
}));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map