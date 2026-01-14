/**
 * Article Routes
 * 
 * Handles news articles and bookmarks.
 */

import { Router, Request, Response, IRouter } from 'express';
import { articleService } from '../services/article.service';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import {
    articleFilterSchema,
    uuidSchema,
    paginationSchema,
} from '../utils/validators';

const router: IRouter = Router();

/**
 * GET /api/articles
 * Get articles with filtering
 */
router.get(
    '/',
    optionalAuthenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const filters = articleFilterSchema.parse(req.query);
        const result = await articleService.getArticles(filters, req.userId);

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
    })
);

/**
 * GET /api/articles/trending
 * Get trending articles
 */
router.get(
    '/trending',
    asyncHandler(async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 10;
        const articles = await articleService.getTrendingArticles(limit);

        res.json({
            success: true,
            data: articles,
        });
    })
);

/**
 * GET /api/articles/categories
 * Get article categories with counts
 */
router.get(
    '/categories',
    asyncHandler(async (_req: Request, res: Response) => {
        const categories = await articleService.getCategoryCounts();

        res.json({
            success: true,
            data: categories,
        });
    })
);

/**
 * GET /api/articles/bookmarks
 * Get user's bookmarked articles
 */
router.get(
    '/bookmarks',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { page, limit } = paginationSchema.parse(req.query);
        const result = await articleService.getUserBookmarks(req.userId!, page, limit);

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
    })
);

/**
 * GET /api/articles/region/:region
 * Get recent articles by region
 */
router.get(
    '/region/:region',
    asyncHandler(async (req: Request, res: Response) => {
        const region = req.params.region;
        const limit = parseInt(req.query.limit as string) || 5;
        const articles = await articleService.getRecentByRegion(region, limit);

        res.json({
            success: true,
            data: articles,
        });
    })
);

/**
 * GET /api/articles/category/:category
 * Get articles by category with priority grouping
 */
router.get(
    '/category/:category',
    asyncHandler(async (req: Request, res: Response) => {
        const category = req.params.category;
        const limit = parseInt(req.query.limit as string) || 10;
        const articles = await articleService.getArticlesByCategory(category, limit);

        res.json({
            success: true,
            data: articles,
        });
    })
);

/**
 * GET /api/articles/:id
 * Get article details
 */
router.get(
    '/:id',
    optionalAuthenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const articleId = uuidSchema.parse(req.params.id);
        const article = await articleService.getArticleById(articleId, req.userId);

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
    })
);

/**
 * POST /api/articles/:id/bookmark
 * Bookmark an article
 */
router.post(
    '/:id/bookmark',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const articleId = uuidSchema.parse(req.params.id);
        await articleService.bookmarkArticle(req.userId!, articleId);

        res.status(201).json({
            success: true,
            message: 'Article bookmarked successfully',
        });
    })
);

/**
 * DELETE /api/articles/:id/bookmark
 * Remove bookmark
 */
router.delete(
    '/:id/bookmark',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const articleId = uuidSchema.parse(req.params.id);
        await articleService.removeBookmark(req.userId!, articleId);

        res.json({
            success: true,
            message: 'Bookmark removed successfully',
        });
    })
);

export default router;
