/**
 * Events API Library
 * 
 * Handles all event discovery and registration operations.
 * Connects frontend to backend event service.
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { getAccessToken } from './auth';

// API base URL - configure based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Event entity interface matching backend
 */
export interface Event {
    id: string;
    title: string;
    description: string;
    eventDate: string;
    eventTime: string;
    endDate?: string;
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
    createdAt: string;
    accessibilityFeatures: string[];
    tags: string[];
    isRegistered?: boolean;
    // For user registrations view
    status?: string;
    registeredAt?: string;
    accommodationNotes?: string;
}

/**
 * Event registration response
 */
export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    accommodationNotes?: string;
    status: string;
    registeredAt: string;
    attended: boolean;
}

/**
 * Pagination info
 */
export interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Paginated events response
 */
export interface EventsResponse {
    success: boolean;
    data: Event[];
    pagination: Pagination;
}

/**
 * Single event response
 */
export interface EventResponse {
    success: boolean;
    data: Event;
}

/**
 * Event filter options
 */
export interface EventFilters {
    category?: string;
    type?: 'virtual' | 'in_person' | 'hybrid';
    startDate?: string;
    endDate?: string;
    accessibilityFeatures?: string[];
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * Event registration input
 */
export interface EventRegistrationInput {
    eventId: string;
    accommodationNotes?: string;
}

/**
 * Accessibility feature
 */
export interface AccessibilityFeature {
    id: string;
    name: string;
    description?: string;
}

/**
 * Category with count
 */
export interface CategoryCount {
    category: string;
    count: number;
}

/**
 * API error response
 */
export interface ApiError {
    success: false;
    message: string;
    code?: string;
}

/**
 * Build query string from filter object
 * Handles arrays properly for accessibility features
 */
function buildQueryString(filters: EventFilters): string {
    const params = new URLSearchParams();

    if (filters.category) {
        params.append('category', filters.category);
    }
    if (filters.type) {
        params.append('type', filters.type);
    }
    if (filters.startDate) {
        params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
        params.append('endDate', filters.endDate);
    }
    if (filters.search) {
        params.append('search', filters.search);
    }
    if (filters.page) {
        params.append('page', filters.page.toString());
    }
    if (filters.limit) {
        params.append('limit', filters.limit.toString());
    }
    // Handle array of accessibility features
    if (filters.accessibilityFeatures && filters.accessibilityFeatures.length > 0) {
        filters.accessibilityFeatures.forEach((feature) => {
            params.append('accessibilityFeatures', feature);
        });
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
}

/**
 * API request helper with auth headers
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const accessToken = getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (accessToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        const error: ApiError = {
            success: false,
            message: data.message || 'Request failed',
            code: data.code,
        };
        throw error;
    }

    return data;
}

/**
 * Get events with optional filtering and pagination
 * 
 * @param filters - Optional filter criteria
 * @returns Paginated list of events
 */
export async function getEvents(filters: EventFilters = {}): Promise<EventsResponse> {
    // Set default pagination
    const queryFilters = {
        page: 1,
        limit: 20,
        ...filters,
    };

    const queryString = buildQueryString(queryFilters);
    return apiRequest<EventsResponse>(`/api/events${queryString}`);
}

/**
 * Get a single event by ID
 * 
 * @param eventId - The event UUID
 * @returns Event details
 */
export async function getEventById(eventId: string): Promise<EventResponse> {
    return apiRequest<EventResponse>(`/api/events/${eventId}`);
}

/**
 * Get featured events
 * 
 * @param limit - Maximum number of featured events to return
 * @returns List of featured events
 */
export async function getFeaturedEvents(limit: number = 5): Promise<{ success: boolean; data: Event[] }> {
    return apiRequest<{ success: boolean; data: Event[] }>(`/api/events/featured?limit=${limit}`);
}

/**
 * Get event categories with counts
 * 
 * @returns List of categories with event counts
 */
export async function getCategories(): Promise<{ success: boolean; data: CategoryCount[] }> {
    return apiRequest<{ success: boolean; data: CategoryCount[] }>('/api/events/categories');
}

/**
 * Get all accessibility features
 * 
 * @returns List of available accessibility features
 */
export async function getAccessibilityFeatures(): Promise<{ success: boolean; data: AccessibilityFeature[] }> {
    return apiRequest<{ success: boolean; data: AccessibilityFeature[] }>('/api/events/accessibility-features');
}

/**
 * Get user's event registrations
 * 
 * @param includePast - Include past events in results
 * @returns List of events the user is registered for
 */
export async function getMyRegistrations(includePast: boolean = false): Promise<{ success: boolean; data: Event[] }> {
    const queryParam = includePast ? '?includePast=true' : '';
    return apiRequest<{ success: boolean; data: Event[] }>(`/api/events/my-registrations${queryParam}`);
}

/**
 * Register for an event
 * 
 * @param input - Registration details
 * @returns Registration confirmation
 */
export async function registerForEvent(
    input: EventRegistrationInput
): Promise<{ success: boolean; message: string; data: EventRegistration }> {
    return apiRequest<{ success: boolean; message: string; data: EventRegistration }>('/api/events/register', {
        method: 'POST',
        body: JSON.stringify(input),
    });
}

/**
 * Cancel event registration
 * 
 * @param eventId - The event UUID to unregister from
 * @returns Success confirmation
 */
export async function cancelRegistration(eventId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/events/${eventId}/registration`, {
        method: 'DELETE',
    });
}

/**
 * Search events by query
 * Convenience wrapper for getEvents with search filter
 * 
 * @param query - Search query string
 * @param additionalFilters - Optional additional filters
 * @returns Paginated search results
 */
export async function searchEvents(
    query: string,
    additionalFilters: Omit<EventFilters, 'search'> = {}
): Promise<EventsResponse> {
    return getEvents({
        ...additionalFilters,
        search: query,
    });
}

/**
 * Get upcoming events (convenience method)
 * Returns events from today onwards
 * 
 * @param filters - Optional additional filters
 * @returns Paginated list of upcoming events
 */
export async function getUpcomingEvents(
    filters: Omit<EventFilters, 'startDate'> = {}
): Promise<EventsResponse> {
    const today = new Date().toISOString().split('T')[0];
    return getEvents({
        ...filters,
        startDate: today,
    });
}

/**
 * Get events by category (convenience method)
 * 
 * @param category - Category name
 * @param additionalFilters - Optional additional filters
 * @returns Paginated list of events in category
 */
export async function getEventsByCategory(
    category: string,
    additionalFilters: Omit<EventFilters, 'category'> = {}
): Promise<EventsResponse> {
    return getEvents({
        ...additionalFilters,
        category,
    });
}

/**
 * Get events with specific accessibility features (convenience method)
 * 
 * @param features - Array of required accessibility features
 * @param additionalFilters - Optional additional filters
 * @returns Paginated list of events with the specified features
 */
export async function getAccessibleEvents(
    features: string[],
    additionalFilters: Omit<EventFilters, 'accessibilityFeatures'> = {}
): Promise<EventsResponse> {
    return getEvents({
        ...additionalFilters,
        accessibilityFeatures: features,
    });
}

/**
 * Check if user is registered for an event
 * Fetches fresh data from server
 * 
 * @param eventId - The event UUID
 * @returns Whether user is registered
 */
export async function isRegistered(eventId: string): Promise<boolean> {
    try {
        const response = await getEventById(eventId);
        return response.data.isRegistered || false;
    } catch {
        return false;
    }
}
