/**
 * User Service
 *
 * Handles user profile management and accessibility settings.
 * Implements efficient search using trigram similarity.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
import { UpdateUserInput, UpdateAccessibilitySettingsInput, SearchUsersInput } from '../utils/validators';
/**
 * User profile interface
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
    emailVerified: boolean;
    createdAt: Date;
}
/**
 * Accessibility settings interface
 */
export interface AccessibilitySettings {
    id: string;
    userId: string;
    highContrast: boolean;
    fontSize: string;
    reducedMotion: boolean;
    screenReaderOptimized: boolean;
    keyboardNavigation: boolean;
    voiceCommandEnabled: boolean;
}
/**
 * Search result with relevance score
 */
interface UserSearchResult extends UserProfile {
    relevanceScore: number;
}
/**
 * UserService - Handles user operations
 *
 * Uses efficient SQL queries with proper indexing
 * Implements pagination using cursor-based approach for large datasets
 */
export declare class UserService {
    /**
     * Get user profile by ID
     *
     * Time Complexity: O(1) with index
     */
    getProfile(userId: string): Promise<UserProfile | null>;
    /**
     * Update user profile
     *
     * Uses dynamic query building for partial updates
     */
    updateProfile(userId: string, input: UpdateUserInput): Promise<UserProfile>;
    /**
     * Get user accessibility settings
     */
    getAccessibilitySettings(userId: string): Promise<AccessibilitySettings | null>;
    /**
     * Update user accessibility settings
     */
    updateAccessibilitySettings(userId: string, input: UpdateAccessibilitySettingsInput): Promise<AccessibilitySettings>;
    /**
     * Search users by name or email
     *
     * Uses PostgreSQL trigram similarity for fuzzy matching
     * Time Complexity: O(n * log(n)) for similarity search with index
     *
     * @param input - Search parameters
     * @param excludeUserId - User ID to exclude (usually the searcher)
     */
    searchUsers(input: SearchUsersInput, excludeUserId?: string): Promise<UserSearchResult[]>;
    /**
     * Soft delete user account
     * Preserves data for compliance but marks as deleted
     */
    deleteAccount(userId: string): Promise<void>;
    /**
     * Get user statistics for dashboard
     */
    getUserStats(userId: string): Promise<{
        eventsRegistered: number;
        messagesCount: number;
        bookmarksCount: number;
        unreadNotifications: number;
    }>;
}
export declare const userService: UserService;
export {};
//# sourceMappingURL=user.service.d.ts.map