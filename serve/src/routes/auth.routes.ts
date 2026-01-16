/**
 * Authentication Routes
 * 
 * Handles user registration, login, logout, and token management.
 * Supports both credential-based and Google OAuth authentication.
 * Implements rate limiting on sensitive endpoints.
 */

import { Router, Request, Response, IRouter } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rate-limiter';
import {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    updatePasswordSchema,
    requestPasswordResetSchema,
    verifyResetCodeSchema,
    resetPasswordSchema,
} from '../utils/validators';

const router: IRouter = Router();

// Google OAuth validation schema
const googleAuthSchema = z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
    additionalInfo: z.object({
        phone: z.string().optional(),
        location: z.string().optional(),
        disabilityType: z.string().optional(),
        accessibilityNeeds: z.string().optional(),
        communicationPreference: z.string().optional(),
        emergencyContact: z.string().optional(),
    }).optional(),
});

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post(
    '/register',
    strictRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const input = registerSchema.parse(req.body);
        const result = await authService.register(input);

        res.status(201).json(result);
    })
);

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post(
    '/login',
    strictRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const input = loginSchema.parse(req.body);
        const sessionInfo = {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('User-Agent'),
        };
        const result = await authService.login(input, sessionInfo);

        res.json(result);
    })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
    '/refresh',
    asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        const tokens = await authService.refreshToken(refreshToken);

        res.json({
            success: true,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        });
    })
);

/**
 * POST /api/auth/logout
 * Logout user and revoke tokens
 */
router.post(
    '/logout',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const refreshToken = req.body.refreshToken;
        await authService.logout(req.userId!, refreshToken);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    })
);

/**
 * POST /api/auth/update-password
 * Update user password (requires authentication)
 */
router.post(
    '/update-password',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
        await authService.updatePassword(req.userId!, currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Password updated successfully',
        });
    })
);

/**
 * POST /api/auth/request-reset
 * Request password reset email
 */
router.post(
    '/request-reset',
    strictRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { email } = requestPasswordResetSchema.parse(req.body);
        const result = await authService.requestPasswordReset(email);

        res.json(result);
    })
);

/**
 * POST /api/auth/verify-reset-code
 * Verify password reset code without resetting password
 */
router.post(
    '/verify-reset-code',
    strictRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { email, code } = verifyResetCodeSchema.parse(req.body);
        const result = await authService.verifyResetCode(email, code);

        res.json(result);
    })
);

/**
 * POST /api/auth/reset-password
 * Reset password using verification code
 */
router.post(
    '/reset-password',
    strictRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { email, code, newPassword } = resetPasswordSchema.parse(req.body);
        const result = await authService.resetPassword(email, code, newPassword);

        res.json(result);
    })
);

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get(
    '/me',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        res.json({
            success: true,
            user: {
                id: req.user?.sub,
                email: req.user?.email,
                role: req.user?.role,
            },
        });
    })
);

/**
 * POST /api/auth/google
 * Authenticate or register via Google OAuth
 * Handles both sign-in and sign-up flows
 */
router.post(
    '/google',
    strictRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { idToken, additionalInfo } = googleAuthSchema.parse(req.body);
        const sessionInfo = {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('User-Agent'),
        };
        const result = await authService.googleAuth(idToken, additionalInfo, sessionInfo);

        res.json(result);
    })
);

export default router;
