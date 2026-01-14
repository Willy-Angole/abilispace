"use strict";
/**
 * Article Routes
 *
 * Handles news articles and bookmarks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const article_service_1 = require("../services/article.service");
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
/**
 * GET /api/articles
 * Get articles with filtering
 */
router.get('/', auth_1.optionalAuthenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const filters = validators_1.articleFilterSchema.parse(req.query);
    const result = await article_service_1.articleService.getArticles(filters, req.userId);
    res.json({
        success: true,
        data: result.items,
        pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        },
    });
}));
/**
 * GET /api/articles/trending
 * Get trending articles
 */
router.get('/trending', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const articles = await article_service_1.articleService.getTrendingArticles(limit);
    res.json({
        success: true,
        data: articles,
    });
}));
/**
 * GET /api/articles/categories
 * Get article categories with counts
 */
router.get('/categories', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    const categories = await article_service_1.articleService.getCategoryCounts();
    res.json({
        success: true,
        data: categories,
    });
}));
/**
 * GET /api/articles/bookmarks
 * Get user's bookmarked articles
 */
router.get('/bookmarks', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const { page, limit } = validators_1.paginationSchema.parse(req.query);
    const result = await article_service_1.articleService.getUserBookmarks(req.userId, page, limit);
    res.json({
        success: true,
        data: result.items,
        pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        },
    });
}));
/**
 * GET /api/articles/region/:region
 * Get recent articles by region
 */
router.get('/region/:region', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const region = req.params.region;
    const limit = parseInt(req.query.limit) || 5;
    const articles = await article_service_1.articleService.getRecentByRegion(region, limit);
    res.json({
        success: true,
        data: articles,
    });
}));
/**
 * GET /api/articles/category/:category
 * Get articles by category with priority grouping
 */
router.get('/category/:category', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const category = req.params.category;
    const limit = parseInt(req.query.limit) || 10;
    const articles = await article_service_1.articleService.getArticlesByCategory(category, limit);
    res.json({
        success: true,
        data: articles,
    });
}));
/**
 * GET /api/articles/:id
 * Get article details
 */
router.get('/:id', auth_1.optionalAuthenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const articleId = validators_1.uuidSchema.parse(req.params.id);
    const article = await article_service_1.articleService.getArticleById(articleId, req.userId);
    if (!article) {
        res.status(404).json({
            success: false,
            message: 'Article not found',
        });
        return;
    }
    res.json({
        success: true,
        data: article,
    });
}));
/**
 * POST /api/articles/:id/bookmark
 * Bookmark an article
 */
router.post('/:id/bookmark', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const articleId = validators_1.uuidSchema.parse(req.params.id);
    await article_service_1.articleService.bookmarkArticle(req.userId, articleId);
    res.status(201).json({
        success: true,
        message: 'Article bookmarked successfully',
    });
}));
/**
 * DELETE /api/articles/:id/bookmark
 * Remove bookmark
 */
router.delete('/:id/bookmark', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const articleId = validators_1.uuidSchema.parse(req.params.id);
    await article_service_1.articleService.removeBookmark(req.userId, articleId);
    res.json({
        success: true,
        message: 'Bookmark removed successfully',
    });
}));
exports.default = router;
//# sourceMappingURL=article.routes.js.map