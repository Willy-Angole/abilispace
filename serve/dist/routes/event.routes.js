"use strict";
/**
 * Event Routes
 *
 * Handles event discovery and registration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_service_1 = require("../services/event.service");
const error_handler_1 = require("../middleware/error-handler");
const auth_1 = require("../middleware/auth");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
/**
 * GET /api/events
 * Get events with filtering
 */
router.get('/', auth_1.optionalAuthenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const filters = validators_1.eventFilterSchema.parse(req.query);
    const result = await event_service_1.eventService.getEvents(filters, req.userId);
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
 * GET /api/events/featured
 * Get featured events
 */
router.get('/featured', (0, error_handler_1.asyncHandler)(async (req, res) => {
    const limit = parseInt(req.query.limit) || 5;
    const events = await event_service_1.eventService.getFeaturedEvents(limit);
    res.json({
        success: true,
        data: events,
    });
}));
/**
 * GET /api/events/categories
 * Get event categories with counts
 */
router.get('/categories', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    const categories = await event_service_1.eventService.getCategoryCounts();
    res.json({
        success: true,
        data: categories,
    });
}));
/**
 * GET /api/events/accessibility-features
 * Get all accessibility features
 */
router.get('/accessibility-features', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    const features = await event_service_1.eventService.getAccessibilityFeatures();
    res.json({
        success: true,
        data: features,
    });
}));
/**
 * GET /api/events/my-registrations
 * Get user's event registrations
 */
router.get('/my-registrations', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const includePast = req.query.includePast === 'true';
    const events = await event_service_1.eventService.getUserRegistrations(req.userId, includePast);
    res.json({
        success: true,
        data: events,
    });
}));
/**
 * GET /api/events/:id
 * Get event details
 */
router.get('/:id', auth_1.optionalAuthenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const eventId = validators_1.uuidSchema.parse(req.params.id);
    const event = await event_service_1.eventService.getEventById(eventId, req.userId);
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
}));
/**
 * POST /api/events/register
 * Register for an event
 */
router.post('/register', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const input = validators_1.eventRegistrationSchema.parse(req.body);
    const registration = await event_service_1.eventService.registerForEvent(req.userId, input);
    res.status(201).json({
        success: true,
        message: 'Successfully registered for event',
        data: registration,
    });
}));
/**
 * DELETE /api/events/:id/registration
 * Cancel event registration
 */
router.delete('/:id/registration', auth_1.authenticate, (0, error_handler_1.asyncHandler)(async (req, res) => {
    const eventId = validators_1.uuidSchema.parse(req.params.id);
    await event_service_1.eventService.cancelRegistration(req.userId, eventId);
    res.json({
        success: true,
        message: 'Registration cancelled successfully',
    });
}));
exports.default = router;
//# sourceMappingURL=event.routes.js.map