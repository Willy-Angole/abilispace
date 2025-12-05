"use strict";
/**
 * Event Service
 *
 * Handles event discovery, registration, and management.
 * Implements efficient filtering with compound indexes.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventService = exports.EventService = void 0;
const pool_1 = require("../database/pool");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../middleware/error-handler");
/**
 * EventService - Handles event operations
 *
 * Uses SQL query builder pattern for dynamic filtering
 * Optimized with proper indexing strategy
 */
class EventService {
    /**
     * Get events with filtering and pagination
     *
     * Implements compound filtering with optimized query building
     * Time Complexity: O(log n) with proper indexes
     */
    async getEvents(filters, userId, includeExpired = false) {
        const { category, type, startDate, endDate, accessibilityFeatures, search, page, limit, } = filters;
        // Build WHERE conditions
        const conditions = ['e.is_published = true', 'e.deleted_at IS NULL'];
        const values = [];
        let paramIndex = 1;
        // By default, exclude past events for regular users (events that ended before today)
        if (!includeExpired) {
            conditions.push('e.event_date >= CURRENT_DATE');
        }
        // Category filter
        if (category) {
            conditions.push(`e.category = $${paramIndex}`);
            values.push(category);
            paramIndex++;
        }
        // Type filter
        if (type) {
            conditions.push(`e.event_type = $${paramIndex}`);
            values.push(type);
            paramIndex++;
        }
        // Date range filter
        if (startDate) {
            conditions.push(`e.event_date >= $${paramIndex}`);
            values.push(startDate);
            paramIndex++;
        }
        if (endDate) {
            conditions.push(`e.event_date <= $${paramIndex}`);
            values.push(endDate);
            paramIndex++;
        }
        // Search filter (uses trigram index for fuzzy search)
        if (search) {
            conditions.push(`(
                e.title ILIKE $${paramIndex}
                OR e.description ILIKE $${paramIndex}
                OR similarity(e.title, $${paramIndex + 1}) > 0.3
            )`);
            values.push(`%${search}%`, search);
            paramIndex += 2;
        }
        // Accessibility features filter (events must have ALL specified features)
        if (accessibilityFeatures && accessibilityFeatures.length > 0) {
            conditions.push(`
                NOT EXISTS (
                    SELECT 1 FROM unnest($${paramIndex}::text[]) AS required_feature
                    WHERE NOT EXISTS (
                        SELECT 1 FROM event_accessibility_features eaf
                        JOIN accessibility_features af ON af.id = eaf.feature_id
                        WHERE eaf.event_id = e.id AND af.name = required_feature
                    )
                )
            `);
            values.push(accessibilityFeatures);
            paramIndex++;
        }
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as count
            FROM events e
            WHERE ${conditions.join(' AND ')}
        `;
        const countResult = await pool_1.db.query(countQuery, { values });
        const total = parseInt(countResult.rows[0].count, 10);
        // Calculate pagination
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);
        // Main query with pagination
        const query = `
            SELECT 
                e.id, e.title, e.description,
                e.event_date as "eventDate", e.event_time as "eventTime",
                e.end_date as "endDate", e.end_time as "endTime",
                e.location, e.virtual_link as "virtualLink",
                e.event_type as "eventType", e.category,
                e.capacity, e.registered_count as "registeredCount",
                e.organizer_id as "organizerId", e.organizer_name as "organizerName",
                e.image_url as "imageUrl", e.image_alt as "imageAlt",
                e.is_featured as "isFeatured", e.created_at as "createdAt",
                COALESCE(
                    (SELECT array_agg(af.name)
                     FROM event_accessibility_features eaf
                     JOIN accessibility_features af ON af.id = eaf.feature_id
                     WHERE eaf.event_id = e.id),
                    '{}'::text[]
                ) as "accessibilityFeatures",
                COALESCE(
                    (SELECT array_agg(et.name)
                     FROM event_tag_relations etr
                     JOIN event_tags et ON et.id = etr.tag_id
                     WHERE etr.event_id = e.id),
                    '{}'::text[]
                ) as "tags"
                ${userId ? `,
                EXISTS (
                    SELECT 1 FROM event_registrations er
                    WHERE er.event_id = e.id AND er.user_id = $${paramIndex}
                      AND er.cancelled_at IS NULL
                ) as "isRegistered"` : ''}
            FROM events e
            WHERE ${conditions.join(' AND ')}
            ORDER BY e.is_featured DESC, e.event_date ASC, e.event_time ASC
            LIMIT $${paramIndex + (userId ? 1 : 0)}
            OFFSET $${paramIndex + (userId ? 2 : 1)}
        `;
        if (userId) {
            values.push(userId);
        }
        values.push(limit, offset);
        const result = await pool_1.db.query(query, { values });
        return {
            items: result.rows,
            total,
            page,
            limit,
            totalPages,
        };
    }
    /**
     * Get single event by ID
     */
    async getEventById(eventId, userId) {
        const query = `
            SELECT 
                e.id, e.title, e.description,
                e.event_date as "eventDate", e.event_time as "eventTime",
                e.end_date as "endDate", e.end_time as "endTime",
                e.location, e.virtual_link as "virtualLink",
                e.event_type as "eventType", e.category,
                e.capacity, e.registered_count as "registeredCount",
                e.organizer_id as "organizerId", e.organizer_name as "organizerName",
                e.image_url as "imageUrl", e.image_alt as "imageAlt",
                e.is_featured as "isFeatured", e.created_at as "createdAt",
                COALESCE(
                    (SELECT array_agg(af.name)
                     FROM event_accessibility_features eaf
                     JOIN accessibility_features af ON af.id = eaf.feature_id
                     WHERE eaf.event_id = e.id),
                    '{}'::text[]
                ) as "accessibilityFeatures",
                COALESCE(
                    (SELECT array_agg(et.name)
                     FROM event_tag_relations etr
                     JOIN event_tags et ON et.id = etr.tag_id
                     WHERE etr.event_id = e.id),
                    '{}'::text[]
                ) as "tags"
                ${userId ? `,
                EXISTS (
                    SELECT 1 FROM event_registrations er
                    WHERE er.event_id = e.id AND er.user_id = $2
                      AND er.cancelled_at IS NULL
                ) as "isRegistered"` : ''}
            FROM events e
            WHERE e.id = $1 AND e.is_published = true AND e.deleted_at IS NULL
        `;
        const values = [eventId];
        if (userId)
            values.push(userId);
        const result = await pool_1.db.query(query, { values });
        return result.rows[0] || null;
    }
    /**
     * Register user for an event
     *
     * Implements optimistic locking to prevent over-registration
     */
    async registerForEvent(userId, input) {
        const { eventId, accommodationNotes } = input;
        // Check event exists and has capacity
        const eventResult = await pool_1.db.query(`SELECT capacity, registered_count, event_date
             FROM events
             WHERE id = $1 AND is_published = true AND deleted_at IS NULL`, { values: [eventId] });
        if (eventResult.rowCount === 0) {
            throw error_handler_1.Errors.notFound('Event');
        }
        const event = eventResult.rows[0];
        // Check if event is in the past (compare dates only, not times)
        // Allow registration until the end of the event day
        const eventDate = new Date(event.event_date);
        const today = new Date();
        eventDate.setHours(23, 59, 59, 999); // End of event day
        if (eventDate < today) {
            throw error_handler_1.Errors.badRequest('Cannot register for past events');
        }
        // Check capacity
        if (event.registered_count >= event.capacity) {
            throw error_handler_1.Errors.conflict('This event is full. No more spots available.');
        }
        // Check if already registered
        const existingReg = await pool_1.db.query(`SELECT id FROM event_registrations
             WHERE event_id = $1 AND user_id = $2 AND cancelled_at IS NULL`, { values: [eventId, userId] });
        if (existingReg.rowCount && existingReg.rowCount > 0) {
            throw error_handler_1.Errors.conflict('You are already registered for this event');
        }
        // Create registration with optimistic locking
        const result = await pool_1.db.transaction(async (client) => {
            // Re-check capacity within transaction
            const lockResult = await client.query(`SELECT registered_count, capacity FROM events WHERE id = $1 FOR UPDATE`, [eventId]);
            if (lockResult.rows[0].registered_count >= lockResult.rows[0].capacity) {
                throw error_handler_1.Errors.conflict('This event is full. No more spots available.');
            }
            // Create registration
            const regResult = await client.query(`INSERT INTO event_registrations (event_id, user_id, accommodation_notes)
                 VALUES ($1, $2, $3)
                 RETURNING id, event_id as "eventId", user_id as "userId",
                           accommodation_notes as "accommodationNotes", status,
                           registered_at as "registeredAt", attended`, [eventId, userId, accommodationNotes || null]);
            return regResult.rows[0];
        });
        logger_1.logger.info('User registered for event', { userId, eventId });
        return result;
    }
    /**
     * Cancel event registration
     */
    async cancelRegistration(userId, eventId) {
        const result = await pool_1.db.query(`UPDATE event_registrations
             SET cancelled_at = CURRENT_TIMESTAMP
             WHERE event_id = $1 AND user_id = $2 AND cancelled_at IS NULL
             RETURNING id`, { values: [eventId, userId] });
        if (result.rowCount === 0) {
            throw error_handler_1.Errors.notFound('Registration');
        }
        logger_1.logger.info('Event registration cancelled', { userId, eventId });
    }
    /**
     * Get user's event registrations
     */
    async getUserRegistrations(userId, includesPast = false) {
        let query = `
            SELECT 
                e.id, e.title, e.description,
                e.event_date as "eventDate", e.event_time as "eventTime",
                e.location, e.event_type as "eventType", e.category,
                e.organizer_name as "organizerName",
                er.status, er.registered_at as "registeredAt",
                er.accommodation_notes as "accommodationNotes",
                true as "isRegistered"
            FROM events e
            JOIN event_registrations er ON er.event_id = e.id
            WHERE er.user_id = $1 AND er.cancelled_at IS NULL
        `;
        if (!includesPast) {
            query += ` AND e.event_date >= CURRENT_DATE`;
        }
        query += ` ORDER BY e.event_date ASC, e.event_time ASC`;
        const result = await pool_1.db.query(query, { values: [userId] });
        return result.rows;
    }
    /**
     * Get featured events
     */
    async getFeaturedEvents(limit = 5) {
        const result = await pool_1.db.query(`SELECT 
                e.id, e.title, e.description,
                e.event_date as "eventDate", e.event_time as "eventTime",
                e.location, e.event_type as "eventType", e.category,
                e.organizer_name as "organizerName", e.image_url as "imageUrl",
                e.capacity, e.registered_count as "registeredCount"
             FROM events e
             WHERE e.is_published = true 
               AND e.deleted_at IS NULL
               AND e.is_featured = true
               AND e.event_date >= CURRENT_DATE
             ORDER BY e.event_date ASC
             LIMIT $1`, { values: [limit] });
        return result.rows;
    }
    /**
     * Get all accessibility features
     */
    async getAccessibilityFeatures() {
        const result = await pool_1.db.query('SELECT id, name, description FROM accessibility_features ORDER BY name');
        return result.rows;
    }
    /**
     * Get event categories with counts
     */
    async getCategoryCounts() {
        const result = await pool_1.db.query(`SELECT category, COUNT(*) as count
             FROM events
             WHERE is_published = true AND deleted_at IS NULL AND event_date >= CURRENT_DATE
             GROUP BY category
             ORDER BY count DESC`);
        return result.rows.map(r => ({
            category: r.category,
            count: parseInt(r.count, 10),
        }));
    }
}
exports.EventService = EventService;
// Export singleton instance
exports.eventService = new EventService();
//# sourceMappingURL=event.service.js.map