/**
 * Cloudinary Configuration
 *
 * Handles image upload and management for user profile pictures
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
import { v2 as cloudinary } from 'cloudinary';
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
export declare function uploadProfileImage(fileBuffer: Buffer, userId: string): Promise<UploadResult>;
/**
 * Delete an image from Cloudinary
 *
 * @param publicId - The public ID of the image to delete
 * @returns Success status
 */
export declare function deleteProfileImage(publicId: string): Promise<boolean>;
/**
 * Generate a placeholder avatar URL
 *
 * @param name - The user's name for generating initials
 * @returns Placeholder avatar URL
 */
export declare function generatePlaceholderAvatar(name: string): string;
export { cloudinary };
//# sourceMappingURL=cloudinary.d.ts.map