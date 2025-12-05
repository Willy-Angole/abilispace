"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const adminService = __importStar(require("../services/admin.service"));
const router = (0, express_1.Router)();
// Environment shorthand
const env = {
    JWT_SECRET: environment_1.config.jwt.secret,
};
// Admin Auth Middleware
const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access token required' });
        }
        const token = authHeader.split(' ')[1];
        const payload = jsonwebtoken_1.default.verify(token, env.JWT_SECRET);
        if (payload.type !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = payload;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
// Role-based access middleware
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.admin || !allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
// =============================================================================
// AUTH ROUTES
// =============================================================================
// Admin Login
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await adminService.adminLogin(email, password, ipAddress, userAgent);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(401).json({ error: error.message || 'Login failed' });
    }
});
// Admin Logout
router.post('/auth/logout', adminAuth, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (req.admin && refreshToken) {
            await adminService.adminLogout(req.admin.sub, refreshToken);
        }
        res.json({ success: true, message: 'Logged out successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Logout failed' });
    }
});
// Get current admin
router.get('/auth/me', adminAuth, (req, res) => {
    res.json({
        success: true,
        data: req.admin
    });
});
// =============================================================================
// DASHBOARD ROUTES
// =============================================================================
// Get dashboard statistics
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch stats' });
    }
});
// Get online users
router.get('/dashboard/online-users', adminAuth, async (req, res) => {
    try {
        const onlineUsers = await adminService.getOnlineUsers();
        res.json({
            success: true,
            data: onlineUsers
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch online users' });
    }
});
// Get daily statistics
router.get('/dashboard/daily-stats', adminAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const stats = await adminService.getDailyStatistics(days);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch daily stats' });
    }
});
// Get user growth data
router.get('/dashboard/user-growth', adminAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const data = await adminService.getUserGrowthData(days);
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch user growth data' });
    }
});
// Get event registration trends
router.get('/dashboard/registration-trends', adminAuth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const data = await adminService.getEventRegistrationTrends(days);
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch registration trends' });
    }
});
// Get top events
router.get('/dashboard/top-events', adminAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const data = await adminService.getTopEvents(limit);
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch top events' });
    }
});
// =============================================================================
// USER MANAGEMENT ROUTES
// =============================================================================
// Get all users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const sortBy = req.query.sortBy;
        const sortOrder = req.query.sortOrder;
        const result = await adminService.getAllUsers(page, limit, search, sortBy, sortOrder);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
});
// Get single user
router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await adminService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch user' });
    }
});
// Toggle user status (activate/deactivate)
router.patch('/users/:id/status', adminAuth, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'isActive boolean required' });
        }
        const user = await adminService.toggleUserStatus(req.admin.sub, req.params.id, isActive);
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update user status' });
    }
});
// Delete user (soft delete)
router.delete('/users/:id', adminAuth, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        await adminService.deleteUser(req.admin.sub, req.params.id);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
});
// =============================================================================
// EVENT MANAGEMENT ROUTES
// =============================================================================
// Get all events
router.get('/events', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const status = req.query.status;
        const result = await adminService.getAllEvents(page, limit, search, status);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch events' });
    }
});
// Get event registrations
router.get('/events/:id/registrations', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await adminService.getEventRegistrations(req.params.id, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        if (error.message === 'Event not found') {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.status(500).json({ error: error.message || 'Failed to fetch registrations' });
    }
});
// Toggle event published status
router.patch('/events/:id/publish', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req, res) => {
    try {
        const { isPublished } = req.body;
        if (typeof isPublished !== 'boolean') {
            return res.status(400).json({ error: 'isPublished boolean required' });
        }
        const event = await adminService.toggleEventPublished(req.admin.sub, req.params.id, isPublished);
        res.json({
            success: true,
            data: event
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update event' });
    }
});
// Toggle event featured status
router.patch('/events/:id/feature', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req, res) => {
    try {
        const { isFeatured } = req.body;
        if (typeof isFeatured !== 'boolean') {
            return res.status(400).json({ error: 'isFeatured boolean required' });
        }
        const event = await adminService.toggleEventFeatured(req.admin.sub, req.params.id, isFeatured);
        res.json({
            success: true,
            data: event
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update event' });
    }
});
// Create new event
router.post('/events', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req, res) => {
    try {
        const { title, description, eventDate, eventTime, endDate, endTime, location, virtualLink, eventType, category, capacity, organizerName, imageUrl, imageAlt, isFeatured, isPublished, accessibilityFeatures, tags } = req.body;
        // Validate required fields
        if (!title || !description || !eventDate || !eventTime || !eventType || !category || !capacity || !organizerName) {
            return res.status(400).json({
                error: 'Required fields: title, description, eventDate, eventTime, eventType, category, capacity, organizerName'
            });
        }
        const event = await adminService.createEvent(req.admin.sub, {
            title, description, eventDate, eventTime, endDate, endTime,
            location, virtualLink, eventType, category, capacity,
            organizerName, imageUrl, imageAlt, isFeatured, isPublished,
            accessibilityFeatures, tags
        });
        res.status(201).json({
            success: true,
            data: event
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create event' });
    }
});
// Delete event
router.delete('/events/:id', adminAuth, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        await adminService.deleteEvent(req.admin.sub, req.params.id);
        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete event' });
    }
});
// Get event categories
router.get('/events/categories', adminAuth, async (req, res) => {
    try {
        const categories = await adminService.getEventCategories();
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch categories' });
    }
});
// Get accessibility features
router.get('/events/accessibility-features', adminAuth, async (req, res) => {
    try {
        const features = await adminService.getAccessibilityFeatures();
        res.json({
            success: true,
            data: features
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch accessibility features' });
    }
});
// =============================================================================
// ARTICLE MANAGEMENT ROUTES
// =============================================================================
// Get all articles
router.get('/articles', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const status = req.query.status;
        const result = await adminService.getAllArticles(page, limit, search, status);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch articles' });
    }
});
// Toggle article published status
router.patch('/articles/:id/publish', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req, res) => {
    try {
        const { isPublished } = req.body;
        if (typeof isPublished !== 'boolean') {
            return res.status(400).json({ error: 'isPublished boolean required' });
        }
        const article = await adminService.toggleArticlePublished(req.admin.sub, req.params.id, isPublished);
        res.json({
            success: true,
            data: article
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update article' });
    }
});
// Create new article
router.post('/articles', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req, res) => {
    try {
        const { title, summary, content, category, source, sourceUrl, author, region, priority, readTimeMinutes, imageUrl, imageAlt, hasAudio, audioUrl, hasVideo, videoUrl, isPublished, tags } = req.body;
        // Validate required fields
        if (!title || !summary || !content || !category || !source) {
            return res.status(400).json({
                error: 'Required fields: title, summary, content, category, source'
            });
        }
        const article = await adminService.createArticle(req.admin.sub, {
            title, summary, content, category, source, sourceUrl, author,
            region, priority, readTimeMinutes, imageUrl, imageAlt,
            hasAudio, audioUrl, hasVideo, videoUrl, isPublished, tags
        });
        res.status(201).json({
            success: true,
            data: article
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create article' });
    }
});
// Delete article
router.delete('/articles/:id', adminAuth, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        await adminService.deleteArticle(req.admin.sub, req.params.id);
        res.json({
            success: true,
            message: 'Article deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to delete article' });
    }
});
// Get article categories
router.get('/articles/categories', adminAuth, async (req, res) => {
    try {
        const categories = await adminService.getArticleCategories();
        res.json({
            success: true,
            data: categories
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch article categories' });
    }
});
// =============================================================================
// REPORTS MANAGEMENT ROUTES
// =============================================================================
// Get reports
router.get('/reports', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const result = await adminService.getReports(page, limit, status);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch reports' });
    }
});
// Update report status
router.patch('/reports/:id', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req, res) => {
    try {
        const { status, resolutionNotes } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'status required' });
        }
        const report = await adminService.updateReportStatus(req.admin.sub, req.params.id, status, resolutionNotes);
        res.json({
            success: true,
            data: report
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update report' });
    }
});
// =============================================================================
// AUDIT LOGS ROUTES
// =============================================================================
// Get admin audit logs
router.get('/audit-logs', adminAuth, requireRole('super_admin', 'admin'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const adminId = req.query.adminId;
        const action = req.query.action;
        const result = await adminService.getAdminAuditLogs(page, limit, adminId, action);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
    }
});
// =============================================================================
// PLATFORM SETTINGS ROUTES
// =============================================================================
// Get platform settings
router.get('/settings', adminAuth, async (req, res) => {
    try {
        const publicOnly = req.admin.role === 'support';
        const settings = await adminService.getPlatformSettings(publicOnly);
        res.json({
            success: true,
            data: settings
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch settings' });
    }
});
// Update platform setting
router.patch('/settings/:key', adminAuth, requireRole('super_admin'), async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ error: 'value required' });
        }
        const setting = await adminService.updatePlatformSetting(req.admin.sub, req.params.key, String(value));
        res.json({
            success: true,
            data: setting
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update setting' });
    }
});
// =============================================================================
// ADMIN USER MANAGEMENT ROUTES (Super Admin Only)
// =============================================================================
// Get admin users
router.get('/admins', adminAuth, requireRole('super_admin'), async (req, res) => {
    try {
        const admins = await adminService.getAdminUsers();
        res.json({
            success: true,
            data: admins
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to fetch admins' });
    }
});
// Create admin user
router.post('/admins', adminAuth, requireRole('super_admin'), async (req, res) => {
    try {
        const { email, password, first_name, last_name, role } = req.body;
        if (!email || !password || !first_name || !last_name || !role) {
            return res.status(400).json({ error: 'All fields required: email, password, first_name, last_name, role' });
        }
        const admin = await adminService.createAdminUser(req.admin.sub, {
            email,
            password,
            first_name,
            last_name,
            role
        });
        res.status(201).json({
            success: true,
            data: admin
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to create admin' });
    }
});
// Update admin role
router.patch('/admins/:id/role', adminAuth, requireRole('super_admin'), async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'role required' });
        }
        const admin = await adminService.updateAdminRole(req.admin.sub, req.params.id, role);
        res.json({
            success: true,
            data: admin
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to update admin role' });
    }
});
// =============================================================================
// UTILITY ROUTES
// =============================================================================
// Trigger daily stats aggregation (for cron job)
router.post('/utils/aggregate-stats', adminAuth, requireRole('super_admin'), async (req, res) => {
    try {
        await adminService.aggregateDailyStats();
        res.json({
            success: true,
            message: 'Daily statistics aggregated successfully'
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Failed to aggregate stats' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map