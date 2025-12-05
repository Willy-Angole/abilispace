"use strict";
/**
 * Profile Routes
 *
 * API endpoints for user profile management
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const profile_service_1 = require("../services/profile.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Configure multer for memory storage (we'll upload to Cloudinary)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const profile = await (0, profile_service_1.getUserProfile)(userId);
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found',
            });
        }
        return res.json({
            success: true,
            profile,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to get profile', { error });
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile',
        });
    }
});
/**
 * PUT /api/profile
 * Update current user's profile
 */
router.put('/', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const updateData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            location: req.body.location,
            disabilityType: req.body.disabilityType,
            accessibilityNeeds: req.body.accessibilityNeeds,
            communicationPreference: req.body.communicationPreference,
            emergencyContact: req.body.emergencyContact,
        };
        // Validate required fields
        if (updateData.firstName !== undefined && !updateData.firstName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'First name cannot be empty',
            });
        }
        if (updateData.lastName !== undefined && !updateData.lastName.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Last name cannot be empty',
            });
        }
        // Validate disability type if provided
        const validDisabilityTypes = ['visual', 'hearing', 'mobility', 'cognitive', 'multiple', 'other', 'prefer_not_to_say', ''];
        if (updateData.disabilityType && !validDisabilityTypes.includes(updateData.disabilityType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid disability type',
            });
        }
        // Validate communication preference if provided
        const validCommPrefs = ['text', 'voice', 'video', 'sign_language', 'email', ''];
        if (updateData.communicationPreference && !validCommPrefs.includes(updateData.communicationPreference)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid communication preference',
            });
        }
        const updatedProfile = await (0, profile_service_1.updateUserProfile)(userId, updateData);
        if (!updatedProfile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found',
            });
        }
        return res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: updatedProfile,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update profile', { error });
        return res.status(500).json({
            success: false,
            message: 'Failed to update profile',
        });
    }
});
/**
 * POST /api/profile/avatar
 * Upload/update user avatar
 */
router.post('/avatar', auth_1.authenticate, (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err) {
            logger_1.logger.error('Multer error during upload', { error: err.message, code: err.code });
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload error',
            });
        }
        next();
    });
}, async (req, res) => {
    try {
        const userId = req.userId;
        logger_1.logger.debug('Avatar upload request', {
            userId,
            hasFile: !!req.file,
            fileSize: req.file?.size,
            mimetype: req.file?.mimetype
        });
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided',
            });
        }
        const result = await (0, profile_service_1.updateUserAvatar)(userId, req.file.buffer);
        if (!result.success) {
            logger_1.logger.error('Avatar upload failed', { userId, error: result.error });
            return res.status(500).json({
                success: false,
                message: result.error || 'Failed to upload avatar',
            });
        }
        return res.json({
            success: true,
            message: 'Avatar updated successfully',
            avatarUrl: result.avatarUrl,
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to upload avatar', { error });
        return res.status(500).json({
            success: false,
            message: 'Failed to upload avatar',
        });
    }
});
/**
 * DELETE /api/profile/avatar
 * Delete user avatar
 */
router.delete('/avatar', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const success = await (0, profile_service_1.deleteUserAvatar)(userId);
        if (!success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete avatar',
            });
        }
        return res.json({
            success: true,
            message: 'Avatar deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete avatar', { error });
        return res.status(500).json({
            success: false,
            message: 'Failed to delete avatar',
        });
    }
});
exports.default = router;
//# sourceMappingURL=profile.routes.js.map