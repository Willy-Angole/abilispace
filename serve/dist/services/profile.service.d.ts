/**
 * User Service
 *
 * Handles user profile management operations
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
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
export declare function getUserProfile(userId: string): Promise<UserProfile | null>;
/**
 * Update user profile
 */
export declare function updateUserProfile(userId: string, data: ProfileUpdateData): Promise<UserProfile | null>;
/**
 * Upload and update user avatar
 */
export declare function updateUserAvatar(userId: string, imageBuffer: Buffer): Promise<{
    success: boolean;
    avatarUrl?: string;
    error?: string;
}>;
/**
 * Delete user avatar
 */
export declare function deleteUserAvatar(userId: string): Promise<boolean>;
//# sourceMappingURL=profile.service.d.ts.map