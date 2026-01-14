"use strict";
/**
 * User Service
 *
 * Handles user profile management and accessibility settings.
 * Implements efficient search using trigram similarity.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const pool_1 = require("../database/pool");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../middleware/error-handler");
/**
 * UserService - Handles user operations
 *
 * Uses efficient SQL queries with proper indexing
 * Implements pagination using cursor-based approach for large datasets
 */
class UserService {
    /**
     * Get user profile by ID
     *
     * Time Complexity: O(1) with index
     */
    async getProfile(userId) {
        const result = await pool_1.db.query(`SELECT id, email, first_name as "firstName", last_name as "lastName",
                    phone, location, disability_type as "disabilityType",
                    accessibility_needs as "accessibilityNeeds",
                    communication_preference as "communicationPreference",
                    email_verified as "emailVerified",
                    created_at as "createdAt"
             FROM users
             WHERE id = $1 AND deleted_at IS NULL`, { values: [userId] });
        return result.rows[0] || null;
    }
    /**
     * Update user profile
     *
     * Uses dynamic query building for partial updates
     */
    async updateProfile(userId, input) {
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;
        // Map input fields to database columns
        const fieldMapping = {
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
            if (!profile)
                throw error_handler_1.Errors.notFound('User');
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
        const result = await pool_1.db.query(query, { values });
        if (result.rowCount === 0) {
            throw error_handler_1.Errors.notFound('User');
        }
        logger_1.logger.info('User profile updated', { userId });
        return result.rows[0];
    }
    /**
     * Get user accessibility settings
     */
    async getAccessibilitySettings(userId) {
        const result = await pool_1.db.query(`SELECT id, user_id as "userId", high_contrast as "highContrast",
                    font_size as "fontSize", reduced_motion as "reducedMotion",
                    screen_reader_optimized as "screenReaderOptimized",
                    keyboard_navigation as "keyboardNavigation",
                    voice_command_enabled as "voiceCommandEnabled"
             FROM user_accessibility_settings
             WHERE user_id = $1`, { values: [userId] });
        return result.rows[0] || null;
    }
    /**
     * Update user accessibility settings
     */
    async updateAccessibilitySettings(userId, input) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        const fieldMapping = {
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
            if (!settings)
                throw error_handler_1.Errors.notFound('Accessibility settings');
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
        const result = await pool_1.db.query(query, { values });
        if (result.rowCount === 0) {
            throw error_handler_1.Errors.notFound('Accessibility settings');
        }
        logger_1.logger.info('Accessibility settings updated', { userId });
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
    async searchUsers(input, excludeUserId) {
        const { query, limit } = input;
        // Normalize search query
        const normalizedQuery = query.toLowerCase().trim();
        // Use trigram similarity for fuzzy search
        // Falls back to ILIKE if trigram extension is not available
        const result = await pool_1.db.query(`SELECT id, email, first_name as "firstName", last_name as "lastName",
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
             LIMIT $4`, { values: [normalizedQuery, excludeUserId || null, `%${normalizedQuery}%`, limit] });
        return result.rows;
    }
    /**
     * Soft delete user account
     * Preserves data for compliance but marks as deleted
     */
    async deleteAccount(userId) {
        await pool_1.db.transaction(async (client) => {
            // Soft delete user
            await client.query(`UPDATE users 
                 SET deleted_at = CURRENT_TIMESTAMP,
                     email = CONCAT(email, '_deleted_', $1),
                     is_active = false
                 WHERE id = $1`, [userId]);
            // Revoke all refresh tokens
            await client.query('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1', [userId]);
            // Leave conversations (soft)
            await client.query(`UPDATE conversation_participants 
                 SET left_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $1 AND left_at IS NULL`, [userId]);
        });
        logger_1.logger.info('User account deleted', { userId });
    }
    /**
     * Get user statistics for dashboard
     */
    async getUserStats(userId) {
        // Use parallel queries for efficiency
        const [events, messages, bookmarks, notifications] = await Promise.all([
            pool_1.db.query(`SELECT COUNT(*) as count FROM event_registrations 
                 WHERE user_id = $1 AND cancelled_at IS NULL`, { values: [userId] }),
            pool_1.db.query(`SELECT COUNT(*) as count FROM messages 
                 WHERE sender_id = $1 AND deleted_at IS NULL`, { values: [userId] }),
            pool_1.db.query('SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = $1', { values: [userId] }),
            pool_1.db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false', { values: [userId] }),
        ]);
        return {
            eventsRegistered: parseInt(events.rows[0].count, 10),
            messagesCount: parseInt(messages.rows[0].count, 10),
            bookmarksCount: parseInt(bookmarks.rows[0].count, 10),
            unreadNotifications: parseInt(notifications.rows[0].count, 10),
        };
    }
}
exports.UserService = UserService;
// Export singleton instance
exports.userService = new UserService();
//# sourceMappingURL=user.service.js.map