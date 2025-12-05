/**
 * Article Service
 *
 * Handles news articles, filtering, and bookmark management.
 * Implements priority-based sorting and efficient text search.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
import { ArticleFilterInput } from '../utils/validators';
/**
 * Article entity interface
 */
export interface Article {
    id: string;
    title: string;
    summary: string;
    content: string;
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
    publishedAt: Date;
    createdAt: Date;
    accessibilityFeatures: string[];
    tags: string[];
    isBookmarked?: boolean;
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
 * ArticleService - Handles article operations
 *
 * Implements:
 * - Priority-weighted sorting using heap-like approach
 * - Full-text search with relevance scoring
 * - Efficient bookmark management
 */
export declare class ArticleService {
    /**
     * Get articles with filtering and pagination
     *
     * Implements multi-criteria sorting:
     * 1. Priority (high > medium > low)
     * 2. Publication date (newest first)
     *
     * Time Complexity: O(n log n) for sorting, O(log n) for index lookups
     */
    getArticles(filters: ArticleFilterInput, userId?: string): Promise<PaginatedResult<Article>>;
    /**
     * Get single article by ID
     */
    getArticleById(articleId: string, userId?: string): Promise<Article | null>;
    /**
     * Bookmark an article
     */
    bookmarkArticle(userId: string, articleId: string): Promise<void>;
    /**
     * Remove bookmark
     */
    removeBookmark(userId: string, articleId: string): Promise<void>;
    /**
     * Get user's bookmarked articles
     *
     * Implements efficient retrieval using covering index
     */
    getUserBookmarks(userId: string, page?: number, limit?: number): Promise<PaginatedResult<Article>>;
    /**
     * Get trending articles (most bookmarked recently)
     *
     * Uses time-decayed popularity scoring
     */
    getTrendingArticles(limit?: number): Promise<Article[]>;
    /**
     * Get articles by category with priority grouping
     */
    getArticlesByCategory(category: string, limit?: number): Promise<{
        high: Article[];
        medium: Article[];
        low: Article[];
    }>;
    /**
     * Get article categories with article counts
     */
    getCategoryCounts(): Promise<Array<{
        category: string;
        count: number;
    }>>;
    /**
     * Get recent articles for a region
     */
    getRecentByRegion(region: string, limit?: number): Promise<Article[]>;
}
export declare const articleService: ArticleService;
export {};
//# sourceMappingURL=article.service.d.ts.map