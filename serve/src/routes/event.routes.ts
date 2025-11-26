/**
 * Event Routes
 * 
 * Handles event discovery and registration.
 */

import { Router, Request, Response, IRouter } from 'express';
import { eventService } from '../services/event.service';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import {
    eventFilterSchema,
    eventRegistrationSchema,
    uuidSchema,
} from '../utils/validators';

const router: IRouter = Router();

/**
 * GET /api/events
 * Get events with filtering
 */
router.get(
    '/',
    optionalAuthenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const filters = eventFilterSchema.parse(req.query);
        const result = await eventService.getEvents(filters, req.userId);

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
 * GET /api/events/featured
 * Get featured events
 */
router.get(
    '/featured',
    asyncHandler(async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 5;
        const events = await eventService.getFeaturedEvents(limit);

        res.json({
            success: true,
            data: events,
        });
    })
);

/**
 * GET /api/events/categories
 * Get event categories with counts
 */
router.get(
    '/categories',
    asyncHandler(async (_req: Request, res: Response) => {
        const categories = await eventService.getCategoryCounts();

        res.json({
            success: true,
            data: categories,
        });
    })
);

/**
 * GET /api/events/accessibility-features
 * Get all accessibility features
 */
router.get(
    '/accessibility-features',
    asyncHandler(async (_req: Request, res: Response) => {
        const features = await eventService.getAccessibilityFeatures();

        res.json({
            success: true,
            data: features,
        });
    })
);

/**
 * GET /api/events/my-registrations
 * Get user's event registrations
 */
router.get(
    '/my-registrations',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const includePast = req.query.includePast === 'true';
        const events = await eventService.getUserRegistrations(req.userId!, includePast);

        res.json({
            success: true,
            data: events,
        });
    })
);

/**
 * GET /api/events/:id
 * Get event details
 */
router.get(
    '/:id',
    optionalAuthenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const eventId = uuidSchema.parse(req.params.id);
        const event = await eventService.getEventById(eventId, req.userId);

        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Event not found',
            });
            return;
        }

        res.json({
            success: true,
            data: event,
        });
    })
);

/**
 * POST /api/events/register
 * Register for an event
 */
router.post(
    '/register',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const input = eventRegistrationSchema.parse(req.body);
        const registration = await eventService.registerForEvent(req.userId!, input);

        res.status(201).json({
            success: true,
            message: 'Successfully registered for event',
            data: registration,
        });
    })
);

/**
 * DELETE /api/events/:id/registration
 * Cancel event registration
 */
router.delete(
    '/:id/registration',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const eventId = uuidSchema.parse(req.params.id);
        await eventService.cancelRegistration(req.userId!, eventId);

        res.json({
            success: true,
            message: 'Registration cancelled successfully',
        });
    })
);

export default router;
