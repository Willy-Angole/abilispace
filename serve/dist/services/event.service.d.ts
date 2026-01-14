/**
 * Event Service
 *
 * Handles event discovery, registration, and management.
 * Implements efficient filtering with compound indexes.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
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
export declare class EventService {
    /**
     * Get events with filtering and pagination
     *
     * Implements compound filtering with optimized query building
     * Time Complexity: O(log n) with proper indexes
     */
    getEvents(filters: EventFilterInput, userId?: string, includeExpired?: boolean): Promise<PaginatedResult<Event>>;
    /**
     * Get single event by ID
     */
    getEventById(eventId: string, userId?: string): Promise<Event | null>;
    /**
     * Register user for an event
     *
     * Implements optimistic locking to prevent over-registration
     */
    registerForEvent(userId: string, input: EventRegistrationInput): Promise<EventRegistration>;
    /**
     * Cancel event registration
     */
    cancelRegistration(userId: string, eventId: string): Promise<void>;
    /**
     * Get user's event registrations
     */
    getUserRegistrations(userId: string, includesPast?: boolean): Promise<Event[]>;
    /**
     * Get featured events
     */
    getFeaturedEvents(limit?: number): Promise<Event[]>;
    /**
     * Get all accessibility features
     */
    getAccessibilityFeatures(): Promise<Array<{
        id: string;
        name: string;
        description?: string;
    }>>;
    /**
     * Get event categories with counts
     */
    getCategoryCounts(): Promise<Array<{
        category: string;
        count: number;
    }>>;
}
export declare const eventService: EventService;
export {};
//# sourceMappingURL=event.service.d.ts.map