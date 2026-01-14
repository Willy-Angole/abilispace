/**
 * User Service
 * 
 * Handles user profile management operations
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { db } from '../database/pool';
import { logger } from '../utils/logger';
import { uploadProfileImage, deleteProfileImage } from '../config/cloudinary';

/**
 * User profile data interface
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  location?: string;
  disabilityType?: string;
  accessibilityNeeds?: string;
  communicationPreference?: string;
  emergencyContact?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile update data interface
 */
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  disabilityType?: string;
  accessibilityNeeds?: string;
  communicationPreference?: string;
  emergencyContact?: string;
  avatarUrl?: string;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const query = `
    SELECT 
      id,
      email,
      first_name as "firstName",
      last_name as "lastName",
      phone,
      location,
      disability_type as "disabilityType",
      accessibility_needs as "accessibilityNeeds",
      communication_preference as "communicationPreference",
      emergency_contact as "emergencyContact",
      avatar_url as "avatarUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM users 
    WHERE id = $1 AND deleted_at IS NULL
  `;

  const result = await db.query(query, { values: [userId] });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as UserProfile;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: ProfileUpdateData
): Promise<UserProfile | null> {
  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.firstName !== undefined) {
    updates.push(`first_name = $${paramIndex++}`);
    values.push(data.firstName);
  }

  if (data.lastName !== undefined) {
    updates.push(`last_name = $${paramIndex++}`);
    values.push(data.lastName);
  }

  if (data.phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(data.phone || null);
  }

  if (data.location !== undefined) {
    updates.push(`location = $${paramIndex++}`);
    values.push(data.location || null);
  }

  if (data.disabilityType !== undefined) {
    updates.push(`disability_type = $${paramIndex++}`);
    values.push(data.disabilityType || null);
  }

  if (data.accessibilityNeeds !== undefined) {
    updates.push(`accessibility_needs = $${paramIndex++}`);
    values.push(data.accessibilityNeeds || null);
  }

  if (data.communicationPreference !== undefined) {
    updates.push(`communication_preference = $${paramIndex++}`);
    values.push(data.communicationPreference || null);
  }

  if (data.emergencyContact !== undefined) {
    updates.push(`emergency_contact = $${paramIndex++}`);
    values.push(data.emergencyContact || null);
  }

  if (data.avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    values.push(data.avatarUrl || null);
  }

  if (updates.length === 0) {
    // No updates provided, just return current profile
    return getUserProfile(userId);
  }

  // Add updated_at
  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add user ID for WHERE clause
  values.push(userId);

  const query = `
    UPDATE users 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING 
      id,
      email,
      first_name as "firstName",
      last_name as "lastName",
      phone,
      location,
      disability_type as "disabilityType",
      accessibility_needs as "accessibilityNeeds",
      communication_preference as "communicationPreference",
      emergency_contact as "emergencyContact",
      avatar_url as "avatarUrl",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  try {
    const result = await db.query(query, { values });

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('User profile updated', { userId });
    return result.rows[0] as UserProfile;
  } catch (error) {
    logger.error('Failed to update user profile', { userId, error });
    throw error;
  }
}

/**
 * Upload and update user avatar
 */
export async function updateUserAvatar(
  userId: string,
  imageBuffer: Buffer
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  try {
    // Get current avatar to delete old one
    const currentProfile = await getUserProfile(userId);

    // Upload new image to Cloudinary
    const uploadResult = await uploadProfileImage(imageBuffer, userId);

    if (!uploadResult.success || !uploadResult.url) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload image',
      };
    }

    // Update user's avatar URL in database
    await updateUserProfile(userId, { avatarUrl: uploadResult.url });

    // Delete old avatar if it was a Cloudinary image
    if (currentProfile?.avatarUrl && currentProfile.avatarUrl.includes('cloudinary')) {
      // Extract public ID and delete (best effort, don't fail if this fails)
      const publicIdMatch = currentProfile.avatarUrl.match(/shiriki\/profiles\/[^.]+/);
      if (publicIdMatch) {
        await deleteProfileImage(publicIdMatch[0]).catch(() => {
          logger.warn('Failed to delete old avatar', { userId });
        });
      }
    }

    logger.info('User avatar updated successfully', { userId, avatarUrl: uploadResult.url });

    return {
      success: true,
      avatarUrl: uploadResult.url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to update user avatar', { userId, error: errorMessage });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Delete user avatar
 */
export async function deleteUserAvatar(userId: string): Promise<boolean> {
  try {
    const profile = await getUserProfile(userId);

    if (profile?.avatarUrl && profile.avatarUrl.includes('cloudinary')) {
      const publicIdMatch = profile.avatarUrl.match(/shiriki\/profiles\/[^.]+/);
      if (publicIdMatch) {
        await deleteProfileImage(publicIdMatch[0]);
      }
    }

    await updateUserProfile(userId, { avatarUrl: undefined });
    logger.info('User avatar deleted', { userId });

    return true;
  } catch (error) {
    logger.error('Failed to delete user avatar', { userId, error });
    return false;
  }
}
