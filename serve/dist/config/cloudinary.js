"use strict";
/**
 * Cloudinary Configuration
 *
 * Handles image upload and management for user profile pictures
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = void 0;
exports.uploadProfileImage = uploadProfileImage;
exports.deleteProfileImage = deleteProfileImage;
exports.generatePlaceholderAvatar = generatePlaceholderAvatar;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const logger_1 = require("../utils/logger");
// Configure Cloudinary with environment variables
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});
/**
 * Upload options for profile images
 */
const PROFILE_IMAGE_OPTIONS = {
    folder: 'shiriki/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    max_bytes: 5 * 1024 * 1024, // 5MB
    transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
    ],
};
/**
 * Upload an image to Cloudinary
 *
 * @param fileBuffer - The image file buffer
 * @param userId - The user ID for naming the file
 * @returns Upload result with URL or error
 */
async function uploadProfileImage(fileBuffer, userId) {
    try {
        // Convert buffer to base64 data URI
        const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
        const result = await new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader.upload(base64Image, {
                folder: PROFILE_IMAGE_OPTIONS.folder,
                public_id: `user_${userId}_${Date.now()}`,
                overwrite: true,
                transformation: PROFILE_IMAGE_OPTIONS.transformation,
                resource_type: 'image',
            }, (error, result) => {
                if (error) {
                    reject(error);
                }
                else if (result) {
                    resolve(result);
                }
                else {
                    reject(new Error('No result from Cloudinary'));
                }
            });
        });
        logger_1.logger.info('Profile image uploaded successfully', {
            userId,
            publicId: result.public_id,
            url: result.secure_url,
        });
        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
        logger_1.logger.error('Failed to upload profile image', { userId, error: errorMessage });
        return {
            success: false,
            error: errorMessage,
        };
    }
}
/**
 * Delete an image from Cloudinary
 *
 * @param publicId - The public ID of the image to delete
 * @returns Success status
 */
async function deleteProfileImage(publicId) {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
        logger_1.logger.info('Profile image deleted', { publicId });
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to delete profile image', { publicId, error });
        return false;
    }
}
/**
 * Generate a placeholder avatar URL
 *
 * @param name - The user's name for generating initials
 * @returns Placeholder avatar URL
 */
function generatePlaceholderAvatar(name) {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    // Use UI Avatars service as fallback
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&color=fff&bold=true`;
}
//# sourceMappingURL=cloudinary.js.map