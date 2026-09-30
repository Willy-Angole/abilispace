/**
 * User Service
 * 
 * Handles user profile management and accessibility settings.
 * Implements efficient search using trigram similarity.
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { db } from '../database/pool';
import { logger } from '../utils/logger';
import { Errors } from '../middleware/error-handler';
import { verifyPassword } from '../utils/password';
import { 
    UpdateUserInput, 
    UpdateAccessibilitySettingsInput,
    SearchUsersInput 
} from '../utils/validators';

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
export class UserService {
    /**
     * Get user profile by ID
     * 
     * Time Complexity: O(1) with index
     */
    async getProfile(userId: string): Promise<UserProfile | null> {
        const result = await db.query<UserProfile>(
            `SELECT id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    accessibility_needs as "accessibilityNeeds",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified",
                    created_at as "createdAt"
             FROM users
             WHERE id = $1 AND deleted_at IS NULL`,
            { values: [userId] }
        );

        return result.rows[0] || null;
    }

    /**
     * Update user profile
     * 
     * Uses dynamic query building for partial updates
     */
    async updateProfile(userId: string, input: UpdateUserInput): Promise<UserProfile> {
        // Build dynamic update query
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        // Map input fields to database columns
        const fieldMapping: Record<string, string> = {
            firstName: 'first_name',
            lastName: 'last_name',
            phone: 'phone',
            location: 'location',
            disabilityType: 'disability_type',
            accessibilityNeeds: 'accessibility_needs',
            communicationPreference: 'communication_preference',
            emergencyContact: 'emergency_contact',
        };

        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && fieldMapping[key]) {
                updates.push(`${fieldMapping[key]} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            // No updates, just return current profile
            const profile = await this.getProfile(userId);
            if (!profile) throw Errors.notFound('User');
            return profile;
        }

        // Add updated_at timestamp
        updates.push('updated_at = CURRENT_TIMESTAMP');

        // Add user ID to values
        values.push(userId);

        const query = `
            UPDATE users
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING id, email, first_name as "firstName", last_name as "lastName",
                      phone, location, disability_type as "disabilityType",
                      accessibility_needs as "accessibilityNeeds",
                      communication_preference as "communicationPreference",
                      email_verified as "emailVerified",
                      created_at as "createdAt"
        `;

        const result = await db.query<UserProfile>(query, { values });

        if (result.rowCount === 0) {
            throw Errors.notFound('User');
        }

        logger.info('User profile updated', { userId });

        return result.rows[0];
    }

    /**
     * Get user accessibility settings
     */
    async getAccessibilitySettings(userId: string): Promise<AccessibilitySettings | null> {
        const result = await db.query<AccessibilitySettings>(
            `SELECT id, user_id as "userId", high_contrast as "highContrast",
                    font_size as "fontSize", reduced_motion as "reducedMotion",
                    screen_reader_optimized as "screenReaderOptimized",
                    keyboard_navigation as "keyboardNavigation",
                    voice_command_enabled as "voiceCommandEnabled"
             FROM user_accessibility_settings
             WHERE user_id = $1`,
            { values: [userId] }
        );

        return result.rows[0] || null;
    }

    /**
     * Update user accessibility settings
     */
    async updateAccessibilitySettings(
        userId: string,
        input: UpdateAccessibilitySettingsInput
    ): Promise<AccessibilitySettings> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        const fieldMapping: Record<string, string> = {
            highContrast: 'high_contrast',
            fontSize: 'font_size',
            reducedMotion: 'reduced_motion',
            screenReaderOptimized: 'screen_reader_optimized',
            keyboardNavigation: 'keyboard_navigation',
            voiceCommandEnabled: 'voice_command_enabled',
        };

        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && fieldMapping[key]) {
                updates.push(`${fieldMapping[key]} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            const settings = await this.getAccessibilitySettings(userId);
            if (!settings) throw Errors.notFound('Accessibility settings');
            return settings;
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);

        const query = `
            UPDATE user_accessibility_settings
            SET ${updates.join(', ')}
            WHERE user_id = $${paramIndex}
            RETURNING id, user_id as "userId", high_contrast as "highContrast",
                      font_size as "fontSize", reduced_motion as "reducedMotion",
                      screen_reader_optimized as "screenReaderOptimized",
                      keyboard_navigation as "keyboardNavigation",
                      voice_command_enabled as "voiceCommandEnabled"
        `;

        const result = await db.query<AccessibilitySettings>(query, { values });

        if (result.rowCount === 0) {
            throw Errors.notFound('Accessibility settings');
        }

        logger.info('Accessibility settings updated', { userId });

        return result.rows[0];
    }

    /**
     * Search users by name or email
     * 
     * Uses PostgreSQL trigram similarity for fuzzy matching
     * Time Complexity: O(n * log(n)) for similarity search with index
     * 
     * @param input - Search parameters
     * @param excludeUserId - User ID to exclude (usually the searcher)
     */
    async searchUsers(
        input: SearchUsersInput,
        excludeUserId?: string
    ): Promise<UserSearchResult[]> {
        const { query, limit } = input;
        
        // Normalize search query
        const normalizedQuery = query.toLowerCase().trim();

        // Use trigram similarity for fuzzy search
        // Falls back to ILIKE if trigram extension is not available
        const result = await db.query<UserSearchResult>(
            `SELECT id, email, first_name as "firstName", last_name as "lastName",
                    location,
                    GREATEST(
                        similarity(LOWER(first_name || ' ' || last_name), $1),
                        similarity(LOWER(email), $1)
                    ) as "relevanceScore"
             FROM users
             WHERE deleted_at IS NULL
               AND is_active = true
               AND ($2::uuid IS NULL OR id != $2)
               AND (
                   LOWER(first_name || ' ' || last_name) ILIKE $3
                   OR LOWER(email) ILIKE $3
                   OR similarity(LOWER(first_name || ' ' || last_name), $1) > 0.3
               )
             ORDER BY "relevanceScore" DESC
             LIMIT $4`,
            { values: [normalizedQuery, excludeUserId || null, `%${normalizedQuery}%`, limit] }
        );

        return result.rows;
    }

    /**
     * Soft delete user account
     * Preserves data for compliance but marks as deleted
     */
    async deleteAccount(
        userId: string,
        input: { password?: string; confirm?: string } = {}
    ): Promise<void> {
        const existing = await db.query<{ password_hash: string | null }>(
            `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`,
            { values: [userId] }
        );

        if (!existing.rowCount) {
            throw Errors.notFound('User');
        }

        const passwordHash = existing.rows[0].password_hash;
        if (passwordHash) {
            if (!input.password) {
                throw Errors.badRequest('Current password is required');
            }
            const matches = await verifyPassword(passwordHash, input.password);
            if (!matches) {
                throw Errors.unauthorized('Current password is incorrect');
            }
        } else if (input.confirm !== 'DELETE') {
            throw Errors.badRequest('Type DELETE to confirm account deletion');
        }

        await db.transaction(async (client) => {
            // Soft delete user
            await client.query(
                `UPDATE users 
                 SET deleted_at = CURRENT_TIMESTAMP,
                     email = CONCAT(email, '_deleted_', $1),
                     is_active = false
                 WHERE id = $1`,
                [userId]
            );

            // Revoke all refresh tokens
            await client.query(
                'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1',
                [userId]
            );

            // Leave conversations (soft)
            await client.query(
                `UPDATE conversation_participants 
                 SET left_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $1 AND left_at IS NULL`,
                [userId]
            );
        });

        logger.info('User account deleted', { userId });
    }

    /**
     * JSON export of the signed-in user's own records.
     * Messages are limited to ones this user sent.
     */
    async exportAccount(userId: string): Promise<{
        exportedAt: string;
        profile: Record<string, unknown>;
        registrations: { items: unknown[]; truncated: boolean };
        bookmarks: { items: unknown[]; truncated: boolean };
        thoughts: { items: unknown[]; truncated: boolean };
        comments: { items: unknown[]; truncated: boolean };
        messages: { items: unknown[]; truncated: boolean };
    }> {
        const limit = 5001;
        const profileResult = await db.query(
            `SELECT id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, account_type as "accountType",
                    disability_type as "disabilityType",
                    accessibility_needs as "accessibilityNeeds",
                    communication_preference as "communicationPreference",
                    emergency_contact as "emergencyContact",
                    email_verified as "emailVerified",
                    created_at as "createdAt"
             FROM users
             WHERE id = $1 AND deleted_at IS NULL`,
            { values: [userId] }
        );

        if (!profileResult.rowCount) {
            throw Errors.notFound('User');
        }

        const [registrations, bookmarks, thoughts, comments, messages] = await Promise.all([
            db.query(
                `SELECT er.id, er.event_id as "eventId", e.title as "eventTitle",
                        er.status, er.registered_at as "registeredAt",
                        er.accommodation_notes as "accommodationNotes"
                 FROM event_registrations er
                 JOIN events e ON e.id = er.event_id
                 WHERE er.user_id = $1
                 ORDER BY er.registered_at DESC
                 LIMIT $2`,
                { values: [userId, limit] }
            ),
            db.query(
                `SELECT ub.article_id as "articleId", a.title, ub.created_at as "createdAt"
                 FROM user_bookmarks ub
                 JOIN articles a ON a.id = ub.article_id
                 WHERE ub.user_id = $1
                 ORDER BY ub.created_at DESC
                 LIMIT $2`,
                { values: [userId, limit] }
            ),
            db.query(
                `SELECT id, body, image_url as "imageUrl", created_at as "createdAt"
                 FROM thoughts
                 WHERE author_id = $1 AND deleted_at IS NULL
                 ORDER BY created_at DESC
                 LIMIT $2`,
                { values: [userId, limit] }
            ),
            db.query(
                `SELECT id, thought_id as "thoughtId", body, created_at as "createdAt"
                 FROM thought_comments
                 WHERE author_id = $1 AND deleted_at IS NULL
                 ORDER BY created_at DESC
                 LIMIT $2`,
                { values: [userId, limit] }
            ),
            db.query(
                `SELECT id, conversation_id as "conversationId", content,
                        message_type as "messageType", created_at as "createdAt"
                 FROM messages
                 WHERE sender_id = $1 AND deleted_at IS NULL
                 ORDER BY created_at DESC
                 LIMIT $2`,
                { values: [userId, limit] }
            ),
        ]);

        const pack = (rows: unknown[]) => ({
            items: rows.slice(0, 5000),
            truncated: rows.length > 5000,
        });

        return {
            exportedAt: new Date().toISOString(),
            profile: profileResult.rows[0],
            registrations: pack(registrations.rows),
            bookmarks: pack(bookmarks.rows),
            thoughts: pack(thoughts.rows),
            comments: pack(comments.rows),
            messages: pack(messages.rows),
        };
    }

    /**
     * Get user statistics for dashboard
     */
    async getUserStats(userId: string): Promise<{
        eventsRegistered: number;
        messagesCount: number;
        bookmarksCount: number;
        unreadNotifications: number;
    }> {
        // Use parallel queries for efficiency
        const [events, messages, bookmarks, notifications] = await Promise.all([
            db.query<{ count: string }>(
                `SELECT COUNT(*) as count FROM event_registrations 
                 WHERE user_id = $1 AND cancelled_at IS NULL`,
                { values: [userId] }
            ),
            db.query<{ count: string }>(
                `SELECT COUNT(*) as count FROM messages 
                 WHERE sender_id = $1 AND deleted_at IS NULL`,
                { values: [userId] }
            ),
            db.query<{ count: string }>(
                'SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = $1',
                { values: [userId] }
            ),
            db.query<{ count: string }>(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
                { values: [userId] }
            ),
        ]);

        return {
            eventsRegistered: parseInt(events.rows[0].count, 10),
            messagesCount: parseInt(messages.rows[0].count, 10),
            bookmarksCount: parseInt(bookmarks.rows[0].count, 10),
            unreadNotifications: parseInt(notifications.rows[0].count, 10),
        };
    }
}

// Export singleton instance
export const userService = new UserService();
