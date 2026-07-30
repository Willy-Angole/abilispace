/**
 * Authentication Routes
 *
 * Handles user registration, login, logout, and token management.
 * Supports both credential-based and Google OAuth authentication.
 * Sets httpOnly cookies for tokens (also returns body for transition).
 */

import { Router, Request, Response, IRouter } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rate-limiter';
import {
    setAuthCookies,
    clearAuthCookies,
    getCookie,
    COOKIE_NAMES,
} from '../utils/cookies';
import {
    registerSchema,
    loginSchema,
    updatePasswordSchema,
    requestPasswordResetSchema,
    verifyResetCodeSchema,
    resetPasswordSchema,
} from '../utils/validators';

const router: IRouter = Router();

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

const refreshBodySchema = z.object({
    refreshToken: z.string().optional(),
});

function attachAuthCookies(
    res: Response,
    result: { accessToken?: string; refreshToken?: string }
): void {
    if (result.accessToken && result.refreshToken) {
        setAuthCookies(res, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        });
    }
}

/**
 * POST /api/auth/register
 */
router.post(
    '/register',
    strictRateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const input = registerSchema.parse(req.body);
        const result = await authService.register(input);
        attachAuthCookies(res, result);
        res.status(201).json(result);
    })
);

/**
 * POST /api/auth/login
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
        attachAuthCookies(res, result);
        res.json(result);
    })
);

/**
 * POST /api/auth/refresh
 * Accepts refresh token from body or httpOnly cookie
 */
router.post(
    '/refresh',
    asyncHandler(async (req: Request, res: Response) => {
        const body = refreshBodySchema.parse(req.body || {});
        const refreshToken =
            body.refreshToken || getCookie(req, COOKIE_NAMES.refresh);

        if (!refreshToken) {
            res.status(401).json({
                success: false,
                message: 'Refresh token required',
                code: 'UNAUTHORIZED',
            });
            return;
        }

        const tokens = await authService.refreshToken(refreshToken);
        setAuthCookies(res, tokens);

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
 */
router.post(
    '/logout',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const refreshToken =
            req.body?.refreshToken || getCookie(req, COOKIE_NAMES.refresh);
        await authService.logout(req.userId!, refreshToken);
        clearAuthCookies(res);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    })
);

/**
 * POST /api/auth/update-password
 */
router.post(
    '/update-password',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
        await authService.updatePassword(req.userId!, currentPassword, newPassword);
        clearAuthCookies(res);

        res.json({
            success: true,
            message: 'Password updated successfully',
        });
    })
);

/**
 * POST /api/auth/request-reset
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
        attachAuthCookies(res, result);
        res.json(result);
    })
);

export default router;
