"use strict";
/**
 * User Routes
 *
 * Handles user profile management and accessibility settings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_service_1 = require("../services/user.service");
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const profile = await user_service_1.userService.getProfile(req.userId);
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
}));
/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.updateUserSchema.parse(req.body);
    const profile = await user_service_1.userService.updateProfile(req.userId, input);
    res.json({
        success: true,
        data: profile,
    });
}));
/**
 * GET /api/users/accessibility-settings
 * Get user's accessibility settings
 */
router.get('/accessibility-settings', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const settings = await user_service_1.userService.getAccessibilitySettings(req.userId);
    res.json({
        success: true,
        data: settings,
    });
}));
/**
 * PUT /api/users/accessibility-settings
 * Update user's accessibility settings
 */
router.put('/accessibility-settings', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.updateAccessibilitySettingsSchema.parse(req.body);
    const settings = await user_service_1.userService.updateAccessibilitySettings(req.userId, input);
    res.json({
        success: true,
        data: settings,
    });
}));
/**
 * GET /api/users/search
 * Search for users by name or email
 */
router.get('/search', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.searchUsersSchema.parse(req.query);
    const users = await user_service_1.userService.searchUsers(input, req.userId);
    res.json({
        success: true,
        data: users,
    });
}));
/**
 * GET /api/users/stats
 * Get user's dashboard statistics
 */
router.get('/stats', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const stats = await user_service_1.userService.getUserStats(req.userId);
    res.json({
        success: true,
        data: stats,
    });
}));
/**
 * DELETE /api/users/account
 * Soft delete user account
 */
router.delete('/account', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    await user_service_1.userService.deleteAccount(req.userId);
    res.json({
        success: true,
        message: 'Account deleted successfully',
    });
}));
exports.default = router;
//# sourceMappingURL=user.routes.js.map