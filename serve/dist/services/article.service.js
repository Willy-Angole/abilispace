"use strict";
/**
 * Article Service
 *
 * Handles news articles, filtering, and bookmark management.
 * Implements priority-based sorting and efficient text search.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleService = exports.ArticleService = void 0;
const pool_1 = require("../database/pool");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../middleware/error-handler");
/**
 * Priority weight mapping for sorting
 * Uses numerical values for efficient SQL sorting
 */
const PRIORITY_WEIGHTS = {
    high: 3,
    medium: 2,
    low: 1,
};
/**
 * ArticleService - Handles article operations
 *
 * Implements:
 * - Priority-weighted sorting using heap-like approach
 * - Full-text search with relevance scoring
 * - Efficient bookmark management
 */
class ArticleService {
    /**
     * Get articles with filtering and pagination
     *
     * Implements multi-criteria sorting:
     * 1. Priority (high > medium > low)
     * 2. Publication date (newest first)
     *
     * Time Complexity: O(n log n) for sorting, O(log n) for index lookups
     */
    async getArticles(filters, userId) {
        const { category, region, priority, accessibilityFeatures, search, page, limit, } = filters;
        // Build WHERE conditions
        const conditions = ['a.is_published = true', 'a.deleted_at IS NULL'];
        const values = [];
        let paramIndex = 1;
        // Category filter
        if (category) {
            conditions.push(`a.category = $${paramIndex}`);
            values.push(category);
            paramIndex++;
        }
        // Region filter
        if (region) {
            conditions.push(`a.region = $${paramIndex}`);
            values.push(region);
            paramIndex++;
        }
        // Priority filter
        if (priority) {
            conditions.push(`a.priority = $${paramIndex}`);
            values.push(priority);
            paramIndex++;
        }
        // Search filter (title, summary, content, tags)
        if (search) {
            conditions.push(`(
                a.title ILIKE $${paramIndex}
                OR a.summary ILIKE $${paramIndex}
                OR a.content ILIKE $${paramIndex}
                OR EXISTS (
                    SELECT 1 FROM article_tag_relations atr
                    JOIN article_tags at ON at.id = atr.tag_id
                    WHERE atr.article_id = a.id AND at.name ILIKE $${paramIndex}
                )
                OR similarity(a.title, $${paramIndex + 1}) > 0.2
            )`);
            values.push(`%${search}%`, search);
            paramIndex += 2;
        }
        // Accessibility features filter
        if (accessibilityFeatures && accessibilityFeatures.length > 0) {
            conditions.push(`
                NOT EXISTS (
                    SELECT 1 FROM unnest($${paramIndex}::text[]) AS required_feature
                    WHERE NOT EXISTS (
                        SELECT 1 FROM article_accessibility_features aaf
                        JOIN accessibility_features af ON af.id = aaf.feature_id
                        WHERE aaf.article_id = a.id AND af.name = required_feature
                    )
                )
            `);
            values.push(accessibilityFeatures);
            paramIndex++;
        }
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as count
            FROM articles a
            WHERE ${conditions.join(' AND ')}
        `;
        const countResult = await pool_1.db.query(countQuery, { values });
        const total = parseInt(countResult.rows[0].count, 10);
        // Calculate pagination
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);
        // Main query with priority-weighted sorting
        const query = `
            SELECT 
                a.id, a.title, a.summary, a.content, a.category,
                a.source, a.source_url as "sourceUrl", a.author,
                a.region, a.priority,
                a.read_time_minutes as "readTimeMinutes",
                a.image_url as "imageUrl", a.image_alt as "imageAlt",
                a.has_audio as "hasAudio", a.audio_url as "audioUrl",
                a.has_video as "hasVideo", a.video_url as "videoUrl",
                a.published_at as "publishedAt", a.created_at as "createdAt",
                COALESCE(
                    (SELECT array_agg(af.name)
                     FROM article_accessibility_features aaf
                     JOIN accessibility_features af ON af.id = aaf.feature_id
                     WHERE aaf.article_id = a.id),
                    '{}'::text[]
                ) as "accessibilityFeatures",
                COALESCE(
                    (SELECT array_agg(at.name)
                     FROM article_tag_relations atr
                     JOIN article_tags at ON at.id = atr.tag_id
                     WHERE atr.article_id = a.id),
                    '{}'::text[]
                ) as "tags"
                ${userId ? `,
                EXISTS (
                    SELECT 1 FROM user_bookmarks ub
                    WHERE ub.article_id = a.id AND ub.user_id = $${paramIndex}
                ) as "isBookmarked"` : ''}
            FROM articles a
            WHERE ${conditions.join(' AND ')}
            ORDER BY 
                CASE a.priority 
                    WHEN 'high' THEN 3 
                    WHEN 'medium' THEN 2 
                    ELSE 1 
                END DESC,
                a.published_at DESC
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
     * Get single article by ID
     */
    async getArticleById(articleId, userId) {
        const query = `
            SELECT 
                a.id, a.title, a.summary, a.content, a.category,
                a.source, a.source_url as "sourceUrl", a.author,
                a.region, a.priority,
                a.read_time_minutes as "readTimeMinutes",
                a.image_url as "imageUrl", a.image_alt as "imageAlt",
                a.has_audio as "hasAudio", a.audio_url as "audioUrl",
                a.has_video as "hasVideo", a.video_url as "videoUrl",
                a.published_at as "publishedAt", a.created_at as "createdAt",
                COALESCE(
                    (SELECT array_agg(af.name)
                     FROM article_accessibility_features aaf
                     JOIN accessibility_features af ON af.id = aaf.feature_id
                     WHERE aaf.article_id = a.id),
                    '{}'::text[]
                ) as "accessibilityFeatures",
                COALESCE(
                    (SELECT array_agg(at.name)
                     FROM article_tag_relations atr
                     JOIN article_tags at ON at.id = atr.tag_id
                     WHERE atr.article_id = a.id),
                    '{}'::text[]
                ) as "tags"
                ${userId ? `,
                EXISTS (
                    SELECT 1 FROM user_bookmarks ub
                    WHERE ub.article_id = a.id AND ub.user_id = $2
                ) as "isBookmarked"` : ''}
            FROM articles a
            WHERE a.id = $1 AND a.is_published = true AND a.deleted_at IS NULL
        `;
        const values = [articleId];
        if (userId)
            values.push(userId);
        const result = await pool_1.db.query(query, { values });
        return result.rows[0] || null;
    }
    /**
     * Bookmark an article
     */
    async bookmarkArticle(userId, articleId) {
        // Verify article exists
        const articleExists = await pool_1.db.query('SELECT id FROM articles WHERE id = $1 AND is_published = true AND deleted_at IS NULL', { values: [articleId] });
        if (articleExists.rowCount === 0) {
            throw error_handler_1.Errors.notFound('Article');
        }
        // Add bookmark (ON CONFLICT handles duplicate gracefully)
        await pool_1.db.query(`INSERT INTO user_bookmarks (user_id, article_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, article_id) DO NOTHING`, { values: [userId, articleId] });
        logger_1.logger.debug('Article bookmarked', { userId, articleId });
    }
    /**
     * Remove bookmark
     */
    async removeBookmark(userId, articleId) {
        const result = await pool_1.db.query('DELETE FROM user_bookmarks WHERE user_id = $1 AND article_id = $2 RETURNING id', { values: [userId, articleId] });
        if (result.rowCount === 0) {
            throw error_handler_1.Errors.notFound('Bookmark');
        }
        logger_1.logger.debug('Bookmark removed', { userId, articleId });
    }
    /**
     * Get user's bookmarked articles
     *
     * Implements efficient retrieval using covering index
     */
    async getUserBookmarks(userId, page = 1, limit = 20) {
        // Get total count
        const countResult = await pool_1.db.query('SELECT COUNT(*) as count FROM user_bookmarks WHERE user_id = $1', { values: [userId] });
        const total = parseInt(countResult.rows[0].count, 10);
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);
        // Get bookmarked articles
        const result = await pool_1.db.query(`SELECT 
                a.id, a.title, a.summary, a.category,
                a.source, a.region, a.priority,
                a.read_time_minutes as "readTimeMinutes",
                a.has_audio as "hasAudio", a.has_video as "hasVideo",
                a.published_at as "publishedAt",
                COALESCE(
                    (SELECT array_agg(af.name)
                     FROM article_accessibility_features aaf
                     JOIN accessibility_features af ON af.id = aaf.feature_id
                     WHERE aaf.article_id = a.id),
                    '{}'::text[]
                ) as "accessibilityFeatures",
                true as "isBookmarked",
                ub.created_at as "bookmarkedAt"
             FROM user_bookmarks ub
             JOIN articles a ON a.id = ub.article_id
             WHERE ub.user_id = $1 AND a.is_published = true AND a.deleted_at IS NULL
             ORDER BY ub.created_at DESC
             LIMIT $2 OFFSET $3`, { values: [userId, limit, offset] });
        return {
            items: result.rows,
            total,
            page,
            limit,
            totalPages,
        };
    }
    /**
     * Get trending articles (most bookmarked recently)
     *
     * Uses time-decayed popularity scoring
     */
    async getTrendingArticles(limit = 10) {
        const result = await pool_1.db.query(`SELECT 
                a.id, a.title, a.summary, a.category,
                a.source, a.region, a.priority,
                a.read_time_minutes as "readTimeMinutes",
                a.has_audio as "hasAudio", a.has_video as "hasVideo",
                a.published_at as "publishedAt",
                COUNT(ub.id) as bookmark_count,
                -- Time-decay score: recent bookmarks worth more
                SUM(
                    CASE 
                        WHEN ub.created_at > NOW() - INTERVAL '24 hours' THEN 3
                        WHEN ub.created_at > NOW() - INTERVAL '7 days' THEN 2
                        ELSE 1
                    END
                ) as trend_score
             FROM articles a
             LEFT JOIN user_bookmarks ub ON ub.article_id = a.id
             WHERE a.is_published = true 
               AND a.deleted_at IS NULL
               AND a.published_at > NOW() - INTERVAL '30 days'
             GROUP BY a.id
             ORDER BY trend_score DESC NULLS LAST, a.published_at DESC
             LIMIT $1`, { values: [limit] });
        return result.rows;
    }
    /**
     * Get articles by category with priority grouping
     */
    async getArticlesByCategory(category, limit = 10) {
        const result = await pool_1.db.query(`SELECT 
                a.id, a.title, a.summary, a.category,
                a.source, a.region, a.priority,
                a.read_time_minutes as "readTimeMinutes",
                a.has_audio as "hasAudio", a.has_video as "hasVideo",
                a.published_at as "publishedAt"
             FROM articles a
             WHERE a.category = $1 AND a.is_published = true AND a.deleted_at IS NULL
             ORDER BY 
                CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                a.published_at DESC
             LIMIT $2`, { values: [category, limit * 3] });
        // Group by priority
        const grouped = {
            high: [],
            medium: [],
            low: [],
        };
        for (const article of result.rows) {
            const priority = article.priority;
            if (grouped[priority].length < limit) {
                grouped[priority].push(article);
            }
        }
        return grouped;
    }
    /**
     * Get article categories with article counts
     */
    async getCategoryCounts() {
        const result = await pool_1.db.query(`SELECT category, COUNT(*) as count
             FROM articles
             WHERE is_published = true AND deleted_at IS NULL
             GROUP BY category
             ORDER BY count DESC`);
        return result.rows.map(r => ({
            category: r.category,
            count: parseInt(r.count, 10),
        }));
    }
    /**
     * Get recent articles for a region
     */
    async getRecentByRegion(region, limit = 5) {
        const result = await pool_1.db.query(`SELECT 
                a.id, a.title, a.summary, a.category,
                a.source, a.region, a.priority,
                a.published_at as "publishedAt"
             FROM articles a
             WHERE a.region = $1 AND a.is_published = true AND a.deleted_at IS NULL
             ORDER BY a.published_at DESC
             LIMIT $2`, { values: [region, limit] });
        return result.rows;
    }
}
exports.ArticleService = ArticleService;
// Export singleton instance
exports.articleService = new ArticleService();
//# sourceMappingURL=article.service.js.map