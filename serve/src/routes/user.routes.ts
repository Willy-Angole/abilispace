/**
 * User Routes
 * 
 * Handles user profile management and accessibility settings.
 */

import { Router, Response, IRouter } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
    updateUserSchema,
    updateAccessibilitySettingsSchema,
    searchUsersSchema,
} from '../utils/validators';

const router: IRouter = Router();

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get(
    '/profile',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const profile = await userService.getProfile(req.userId!);

        if (!profile) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        res.json({
            success: true,
            data: profile,
        });
    })
);

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put(
    '/profile',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const input = updateUserSchema.parse(req.body);
        const profile = await userService.updateProfile(req.userId!, input);

        res.json({
            success: true,
            data: profile,
        });
    })
);

/**
 * GET /api/users/accessibility-settings
 * Get user's accessibility settings
 */
router.get(
    '/accessibility-settings',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const settings = await userService.getAccessibilitySettings(req.userId!);

        res.json({
            success: true,
            data: settings,
        });
    })
);

/**
 * PUT /api/users/accessibility-settings
 * Update user's accessibility settings
 */
router.put(
    '/accessibility-settings',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const input = updateAccessibilitySettingsSchema.parse(req.body);
        const settings = await userService.updateAccessibilitySettings(req.userId!, input);

        res.json({
            success: true,
            data: settings,
        });
    })
);

/**
 * GET /api/users/search
 * Search for users by name or email
 */
router.get(
    '/search',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const input = searchUsersSchema.parse(req.query);
        const users = await userService.searchUsers(input, req.userId);

        res.json({
            success: true,
            data: users,
        });
    })
);

/**
 * GET /api/users/stats
 * Get user's dashboard statistics
 */
router.get(
    '/stats',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const stats = await userService.getUserStats(req.userId!);

        res.json({
            success: true,
            data: stats,
        });
    })
);

/**
 * DELETE /api/users/account
 * Soft delete user account
 */
router.delete(
    '/account',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await userService.deleteAccount(req.userId!);

        res.json({
            success: true,
            message: 'Account deleted successfully',
        });
    })
);

export default router;
