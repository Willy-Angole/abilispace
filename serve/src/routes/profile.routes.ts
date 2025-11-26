/**
 * Profile Routes
 * 
 * API endpoints for user profile management
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { Router, Response, IRouter } from 'express';
import multer from 'multer';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  deleteUserAvatar,
  ProfileUpdateData,
} from '../services/profile.service';
import { logger } from '../utils/logger';

const router: IRouter = Router();

// Configure multer for memory storage (we'll upload to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const profile = await getUserProfile(userId);

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
  } catch (error) {
    logger.error('Failed to get profile', { error });
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
router.put('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const updateData: ProfileUpdateData = {
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

    const updatedProfile = await updateUserProfile(userId, updateData);

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
  } catch (error) {
    logger.error('Failed to update profile', { error });
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
router.post(
  '/avatar',
  authenticate,
  (req: AuthenticatedRequest, res: Response, next) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) {
        logger.error('Multer error during upload', { error: err.message, code: err.code });
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload error',
        });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;

      logger.debug('Avatar upload request', { 
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

      const result = await updateUserAvatar(userId, req.file.buffer);

      if (!result.success) {
        logger.error('Avatar upload failed', { userId, error: result.error });
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
    } catch (error) {
      logger.error('Failed to upload avatar', { error });
      return res.status(500).json({
        success: false,
        message: 'Failed to upload avatar',
      });
    }
  }
);

/**
 * DELETE /api/profile/avatar
 * Delete user avatar
 */
router.delete('/avatar', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const success = await deleteUserAvatar(userId);

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
  } catch (error) {
    logger.error('Failed to delete avatar', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete avatar',
    });
  }
});

export default router;
