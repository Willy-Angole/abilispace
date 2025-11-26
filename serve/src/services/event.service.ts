/**
 * Event Service
 * 
 * Handles event discovery, registration, and management.
 * Implements efficient filtering with compound indexes.
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { db } from '../database/pool';
import { logger } from '../utils/logger';
import { Errors } from '../middleware/error-handler';
import { EventFilterInput, EventRegistrationInput } from '../utils/validators';

/**
 * Event entity interface
 */
export interface Event {
    id: string;
    title: string;
    description: string;
    eventDate: Date;
    eventTime: string;
    endDate?: Date;
    endTime?: string;
    location?: string;
    virtualLink?: string;
    eventType: 'virtual' | 'in_person' | 'hybrid';
    category: string;
    capacity: number;
    registeredCount: number;
    organizerId?: string;
    organizerName: string;
    imageUrl?: string;
    imageAlt?: string;
    isFeatured: boolean;
    createdAt: Date;
    accessibilityFeatures: string[];
    tags: string[];
    isRegistered?: boolean;
}

/**
 * Event registration interface
 */
export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    accommodationNotes?: string;
    status: string;
    registeredAt: Date;
    attended: boolean;
}

/**
 * Paginated result interface
 */
interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * EventService - Handles event operations
 * 
 * Uses SQL query builder pattern for dynamic filtering
 * Optimized with proper indexing strategy
 */
export class EventService {
    /**
     * Get events with filtering and pagination
     * 
     * Implements compound filtering with optimized query building
     * Time Complexity: O(log n) with proper indexes
     */
    async getEvents(
        filters: EventFilterInput,
        userId?: string
    ): Promise<PaginatedResult<Event>> {
        const {
            category,
            type,
            startDate,
            endDate,
            accessibilityFeatures,
            search,
            page,
            limit,
        } = filters;

        // Build WHERE conditions
        const conditions: string[] = ['e.is_published = true', 'e.deleted_at IS NULL'];
        const values: unknown[] = [];
        let paramIndex = 1;

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

        const countResult = await db.query<{ count: string }>(countQuery, { values });
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

        const result = await db.query<Event>(query, { values });

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
    async getEventById(eventId: string, userId?: string): Promise<Event | null> {
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

        const values: unknown[] = [eventId];
        if (userId) values.push(userId);

        const result = await db.query<Event>(query, { values });

        return result.rows[0] || null;
    }

    /**
     * Register user for an event
     * 
     * Implements optimistic locking to prevent over-registration
     */
    async registerForEvent(
        userId: string,
        input: EventRegistrationInput
    ): Promise<EventRegistration> {
        const { eventId, accommodationNotes } = input;

        // Check event exists and has capacity
        const eventResult = await db.query<{
            capacity: number;
            registered_count: number;
            event_date: Date;
        }>(
            `SELECT capacity, registered_count, event_date
             FROM events
             WHERE id = $1 AND is_published = true AND deleted_at IS NULL`,
            { values: [eventId] }
        );

        if (eventResult.rowCount === 0) {
            throw Errors.notFound('Event');
        }

        const event = eventResult.rows[0];

        // Check if event is in the past
        if (new Date(event.event_date) < new Date()) {
            throw Errors.badRequest('Cannot register for past events');
        }

        // Check capacity
        if (event.registered_count >= event.capacity) {
            throw Errors.conflict('Event is at full capacity');
        }

        // Check if already registered
        const existingReg = await db.query(
            `SELECT id FROM event_registrations
             WHERE event_id = $1 AND user_id = $2 AND cancelled_at IS NULL`,
            { values: [eventId, userId] }
        );

        if (existingReg.rowCount && existingReg.rowCount > 0) {
            throw Errors.conflict('You are already registered for this event');
        }

        // Create registration with optimistic locking
        const result = await db.transaction(async (client) => {
            // Re-check capacity within transaction
            const lockResult = await client.query<{ registered_count: number; capacity: number }>(
                `SELECT registered_count, capacity FROM events WHERE id = $1 FOR UPDATE`,
                [eventId]
            );

            if (lockResult.rows[0].registered_count >= lockResult.rows[0].capacity) {
                throw Errors.conflict('Event is at full capacity');
            }

            // Create registration
            const regResult = await client.query<EventRegistration>(
                `INSERT INTO event_registrations (event_id, user_id, accommodation_notes)
                 VALUES ($1, $2, $3)
                 RETURNING id, event_id as "eventId", user_id as "userId",
                           accommodation_notes as "accommodationNotes", status,
                           registered_at as "registeredAt", attended`,
                [eventId, userId, accommodationNotes || null]
            );

            return regResult.rows[0];
        });

        logger.info('User registered for event', { userId, eventId });

        return result;
    }

    /**
     * Cancel event registration
     */
    async cancelRegistration(userId: string, eventId: string): Promise<void> {
        const result = await db.query(
            `UPDATE event_registrations
             SET cancelled_at = CURRENT_TIMESTAMP
             WHERE event_id = $1 AND user_id = $2 AND cancelled_at IS NULL
             RETURNING id`,
            { values: [eventId, userId] }
        );

        if (result.rowCount === 0) {
            throw Errors.notFound('Registration');
        }

        logger.info('Event registration cancelled', { userId, eventId });
    }

    /**
     * Get user's event registrations
     */
    async getUserRegistrations(
        userId: string,
        includesPast: boolean = false
    ): Promise<Event[]> {
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

        const result = await db.query<Event>(query, { values: [userId] });

        return result.rows;
    }

    /**
     * Get featured events
     */
    async getFeaturedEvents(limit: number = 5): Promise<Event[]> {
        const result = await db.query<Event>(
            `SELECT 
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
             LIMIT $1`,
            { values: [limit] }
        );

        return result.rows;
    }

    /**
     * Get all accessibility features
     */
    async getAccessibilityFeatures(): Promise<Array<{ id: string; name: string; description?: string }>> {
        const result = await db.query<{ id: string; name: string; description: string }>(
            'SELECT id, name, description FROM accessibility_features ORDER BY name'
        );

        return result.rows;
    }

    /**
     * Get event categories with counts
     */
    async getCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
        const result = await db.query<{ category: string; count: string }>(
            `SELECT category, COUNT(*) as count
             FROM events
             WHERE is_published = true AND deleted_at IS NULL AND event_date >= CURRENT_DATE
             GROUP BY category
             ORDER BY count DESC`
        );

        return result.rows.map(r => ({
            category: r.category,
            count: parseInt(r.count, 10),
        }));
    }
}

// Export singleton instance
export const eventService = new EventService();
