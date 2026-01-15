/**
 * Cloudinary Configuration
 * 
 * Handles image upload and management for user profile pictures
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { config } from './environment';
import { logger } from '../utils/logger';

// Configure Cloudinary with environment variables
cloudinary.config({
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
 * Upload result interface
 */
export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

/**
 * Upload an image to Cloudinary
 * 
 * @param fileBuffer - The image file buffer
 * @param userId - The user ID for naming the file
 * @returns Upload result with URL or error
 */
export async function uploadProfileImage(
  fileBuffer: Buffer,
  userId: string
): Promise<UploadResult> {
  try {
    // Convert buffer to base64 data URI
    const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload(
        base64Image,
        {
          folder: PROFILE_IMAGE_OPTIONS.folder,
          public_id: `user_${userId}_${Date.now()}`,
          overwrite: true,
          transformation: PROFILE_IMAGE_OPTIONS.transformation,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );
    });

    logger.info('Profile image uploaded successfully', {
      userId,
      publicId: result.public_id,
      url: result.secure_url,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    logger.error('Failed to upload profile image', { userId, error: errorMessage });

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
export async function deleteProfileImage(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info('Profile image deleted', { publicId });
    return true;
  } catch (error) {
    logger.error('Failed to delete profile image', { publicId, error });
    return false;
  }
}

/**
 * Generate a placeholder avatar URL
 * 
 * @param name - The user's name for generating initials
 * @returns Placeholder avatar URL
 */
export function generatePlaceholderAvatar(name: string): string {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Use UI Avatars service as fallback
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&color=fff&bold=true`;
}

/**
 * Generic upload options interface
 */
interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: Array<Record<string, unknown>>;
}

/**
 * Upload any image to Cloudinary with custom options
 * 
 * @param fileBuffer - The image file buffer
 * @param options - Upload options (folder, transformation, etc.)
 * @returns Upload result with URL or error
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<UploadResult> {
  try {
    // Convert buffer to base64 data URI
    const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload(
        base64Image,
        {
          folder: options.folder || 'shiriki/uploads',
          public_id: options.publicId || `upload_${Date.now()}`,
          overwrite: true,
          transformation: options.transformation || [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );
    });

    logger.info('Image uploaded successfully to Cloudinary', {
      folder: options.folder,
      publicId: result.public_id,
      url: result.secure_url,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    logger.error('Failed to upload image to Cloudinary', { folder: options.folder, error: errorMessage });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export { cloudinary };
