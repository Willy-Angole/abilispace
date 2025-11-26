/**
 * Articles API Library
 * 
 * Handles all news article and bookmark operations.
 * Connects frontend to backend article service.
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import { getAccessToken } from './auth';

// API base URL - configure based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Article entity interface matching backend
 */
export interface Article {
    id: string;
    title: string;
    summary: string;
    content?: string;
    category: string;
    source: string;
    sourceUrl?: string;
    author?: string;
    region: string;
    priority: 'high' | 'medium' | 'low';
    readTimeMinutes: number;
    imageUrl?: string;
    imageAlt?: string;
    hasAudio: boolean;
    audioUrl?: string;
    hasVideo: boolean;
    videoUrl?: string;
    publishedAt: string;
    createdAt?: string;
    accessibilityFeatures: string[];
    tags: string[];
    isBookmarked?: boolean;
    bookmarkedAt?: string;
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
 * Paginated articles response
 */
export interface ArticlesResponse {
    success: boolean;
    data: Article[];
    pagination: Pagination;
}

/**
 * Single article response
 */
export interface ArticleResponse {
    success: boolean;
    data: Article;
}

/**
 * Article filter options
 */
export interface ArticleFilters {
    category?: string;
    region?: string;
    priority?: 'high' | 'medium' | 'low';
    accessibilityFeatures?: string[];
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * Category with count
 */
export interface CategoryCount {
    category: string;
    count: number;
}

/**
 * Priority-grouped articles
 */
export interface PriorityGroupedArticles {
    high: Article[];
    medium: Article[];
    low: Article[];
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
 */
function buildQueryString(filters: ArticleFilters): string {
    const params = new URLSearchParams();

    if (filters.category) {
        params.append('category', filters.category);
    }
    if (filters.region) {
        params.append('region', filters.region);
    }
    if (filters.priority) {
        params.append('priority', filters.priority);
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
 * Get articles with optional filtering and pagination
 * 
 * @param filters - Optional filter criteria
 * @returns Paginated list of articles
 */
export async function getArticles(filters: ArticleFilters = {}): Promise<ArticlesResponse> {
    // Set default pagination
    const queryFilters = {
        page: 1,
        limit: 20,
        ...filters,
    };

    const queryString = buildQueryString(queryFilters);
    return apiRequest<ArticlesResponse>(`/api/articles${queryString}`);
}

/**
 * Get a single article by ID
 * 
 * @param articleId - The article UUID
 * @returns Article details with full content
 */
export async function getArticleById(articleId: string): Promise<ArticleResponse> {
    return apiRequest<ArticleResponse>(`/api/articles/${articleId}`);
}

/**
 * Get trending articles (most bookmarked recently)
 * 
 * @param limit - Maximum number of trending articles to return
 * @returns List of trending articles
 */
export async function getTrendingArticles(limit: number = 10): Promise<{ success: boolean; data: Article[] }> {
    return apiRequest<{ success: boolean; data: Article[] }>(`/api/articles/trending?limit=${limit}`);
}

/**
 * Get article categories with counts
 * 
 * @returns List of categories with article counts
 */
export async function getCategories(): Promise<{ success: boolean; data: CategoryCount[] }> {
    return apiRequest<{ success: boolean; data: CategoryCount[] }>('/api/articles/categories');
}

/**
 * Get articles by category with priority grouping
 * 
 * @param category - Category name
 * @param limit - Maximum articles per priority level
 * @returns Articles grouped by priority (high, medium, low)
 */
export async function getArticlesByCategory(
    category: string,
    limit: number = 10
): Promise<{ success: boolean; data: PriorityGroupedArticles }> {
    return apiRequest<{ success: boolean; data: PriorityGroupedArticles }>(
        `/api/articles/category/${encodeURIComponent(category)}?limit=${limit}`
    );
}

/**
 * Get recent articles by region
 * 
 * @param region - Region name
 * @param limit - Maximum articles to return
 * @returns List of recent articles from the region
 */
export async function getArticlesByRegion(
    region: string,
    limit: number = 5
): Promise<{ success: boolean; data: Article[] }> {
    return apiRequest<{ success: boolean; data: Article[] }>(
        `/api/articles/region/${encodeURIComponent(region)}?limit=${limit}`
    );
}

/**
 * Get user's bookmarked articles
 * 
 * @param page - Page number
 * @param limit - Items per page
 * @returns Paginated list of bookmarked articles
 */
export async function getBookmarks(
    page: number = 1,
    limit: number = 20
): Promise<ArticlesResponse> {
    return apiRequest<ArticlesResponse>(`/api/articles/bookmarks?page=${page}&limit=${limit}`);
}

/**
 * Bookmark an article
 * 
 * @param articleId - The article UUID to bookmark
 * @returns Success confirmation
 */
export async function bookmarkArticle(articleId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/articles/${articleId}/bookmark`, {
        method: 'POST',
    });
}

/**
 * Remove a bookmark
 * 
 * @param articleId - The article UUID to unbookmark
 * @returns Success confirmation
 */
export async function removeBookmark(articleId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/articles/${articleId}/bookmark`, {
        method: 'DELETE',
    });
}

/**
 * Search articles by query
 * Convenience wrapper for getArticles with search filter
 * 
 * @param query - Search query string
 * @param additionalFilters - Optional additional filters
 * @returns Paginated search results
 */
export async function searchArticles(
    query: string,
    additionalFilters: Omit<ArticleFilters, 'search'> = {}
): Promise<ArticlesResponse> {
    return getArticles({
        ...additionalFilters,
        search: query,
    });
}

/**
 * Get high priority articles (convenience method)
 * Returns only high-priority news articles
 * 
 * @param filters - Optional additional filters
 * @returns Paginated list of high priority articles
 */
export async function getHighPriorityArticles(
    filters: Omit<ArticleFilters, 'priority'> = {}
): Promise<ArticlesResponse> {
    return getArticles({
        ...filters,
        priority: 'high',
    });
}

/**
 * Get articles with audio content (convenience method)
 * For users who prefer audio content
 * 
 * @param filters - Optional additional filters
 * @returns Paginated list of articles with audio
 */
export async function getArticlesWithAudio(
    filters: ArticleFilters = {}
): Promise<ArticlesResponse> {
    // Note: This filters client-side since backend doesn't have hasAudio filter
    // In production, add this filter to the backend
    const response = await getArticles(filters);
    return {
        ...response,
        data: response.data.filter(article => article.hasAudio),
    };
}

/**
 * Check if user has bookmarked an article
 * Fetches fresh data from server
 * 
 * @param articleId - The article UUID
 * @returns Whether article is bookmarked
 */
export async function isBookmarked(articleId: string): Promise<boolean> {
    try {
        const response = await getArticleById(articleId);
        return response.data.isBookmarked || false;
    } catch {
        return false;
    }
}

/**
 * Toggle bookmark status for an article
 * 
 * @param articleId - The article UUID
 * @param currentlyBookmarked - Current bookmark status
 * @returns New bookmark status
 */
export async function toggleBookmark(
    articleId: string,
    currentlyBookmarked: boolean
): Promise<boolean> {
    if (currentlyBookmarked) {
        await removeBookmark(articleId);
        return false;
    } else {
        await bookmarkArticle(articleId);
        return true;
    }
}

/**
 * Get related articles by category (convenience method)
 * Useful for showing related content on article detail pages
 * 
 * @param category - Category to search in
 * @param excludeId - Article ID to exclude from results
 * @param limit - Maximum articles to return
 * @returns List of related articles
 */
export async function getRelatedArticles(
    category: string,
    excludeId: string,
    limit: number = 5
): Promise<Article[]> {
    const response = await getArticles({
        category,
        limit: limit + 1, // Get one extra to account for exclusion
    });

    return response.data
        .filter(article => article.id !== excludeId)
        .slice(0, limit);
}
