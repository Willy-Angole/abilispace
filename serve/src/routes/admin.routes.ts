import { Router, Request, Response, NextFunction } from 'express';
import type { Router as RouterType } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import * as adminService from '../services/admin.service';

const router: RouterType = Router();

// Environment shorthand
const env = {
  JWT_SECRET: config.jwt.secret,
};

// Types for authenticated admin request
interface AdminPayload {
  sub: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  type: 'admin';
}

interface AdminRequest extends Request {
  admin?: AdminPayload;
}

// Admin Auth Middleware
const adminAuth = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminPayload;

    if (payload.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based access middleware
const requireRole = (...allowedRoles: string[]) => {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
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
router.post('/auth/login', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Admin Logout
router.post('/auth/logout', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (req.admin && refreshToken) {
      await adminService.adminLogout(req.admin.sub, refreshToken);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
});

// Get current admin
router.get('/auth/me', adminAuth, (req: AdminRequest, res: Response) => {
  res.json({
    success: true,
    data: req.admin
  });
});

// =============================================================================
// DASHBOARD ROUTES
// =============================================================================

// Get dashboard statistics
router.get('/dashboard/stats', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

// Get online users
router.get('/dashboard/online-users', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const onlineUsers = await adminService.getOnlineUsers();
    res.json({
      success: true,
      data: onlineUsers
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch online users' });
  }
});

// Get daily statistics
router.get('/dashboard/daily-stats', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await adminService.getDailyStatistics(days);
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch daily stats' });
  }
});

// Get user growth data
router.get('/dashboard/user-growth', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await adminService.getUserGrowthData(days);
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user growth data' });
  }
});

// Get event registration trends
router.get('/dashboard/registration-trends', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await adminService.getEventRegistrationTrends(days);
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch registration trends' });
  }
});

// Get top events
router.get('/dashboard/top-events', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const data = await adminService.getTopEvents(limit);
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch top events' });
  }
});

// =============================================================================
// USER MANAGEMENT ROUTES
// =============================================================================

// Get all users
router.get('/users', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc';

    const result = await adminService.getAllUsers(page, limit, search, sortBy, sortOrder);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Get single user
router.get('/users/:id', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch user' });
  }
});

// Toggle user status (activate/deactivate)
router.patch('/users/:id/status', adminAuth, requireRole('super_admin', 'admin'), async (req: AdminRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive boolean required' });
    }

    const user = await adminService.toggleUserStatus(req.admin!.sub, req.params.id, isActive);
    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update user status' });
  }
});

// Delete user (soft delete)
router.delete('/users/:id', adminAuth, requireRole('super_admin', 'admin'), async (req: AdminRequest, res: Response) => {
  try {
    await adminService.deleteUser(req.admin!.sub, req.params.id);
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// =============================================================================
// EVENT MANAGEMENT ROUTES
// =============================================================================

// Get all events
router.get('/events', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as 'upcoming' | 'ongoing' | 'past' | 'all';

    const result = await adminService.getAllEvents(page, limit, search, status);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch events' });
  }
});

// Get event registrations
router.get('/events/:id/registrations', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await adminService.getEventRegistrations(req.params.id, page, limit);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.message === 'Event not found') {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(500).json({ error: error.message || 'Failed to fetch registrations' });
  }
});

// Toggle event published status
router.patch('/events/:id/publish', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req: AdminRequest, res: Response) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ error: 'isPublished boolean required' });
    }

    const event = await adminService.toggleEventPublished(req.admin!.sub, req.params.id, isPublished);
    res.json({
      success: true,
      data: event
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update event' });
  }
});

// Toggle event featured status
router.patch('/events/:id/feature', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req: AdminRequest, res: Response) => {
  try {
    const { isFeatured } = req.body;
    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({ error: 'isFeatured boolean required' });
    }

    const event = await adminService.toggleEventFeatured(req.admin!.sub, req.params.id, isFeatured);
    res.json({
      success: true,
      data: event
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update event' });
  }
});

// =============================================================================
// ARTICLE MANAGEMENT ROUTES
// =============================================================================

// Get all articles
router.get('/articles', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as 'published' | 'draft' | 'all';

    const result = await adminService.getAllArticles(page, limit, search, status);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch articles' });
  }
});

// Toggle article published status
router.patch('/articles/:id/publish', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req: AdminRequest, res: Response) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ error: 'isPublished boolean required' });
    }

    const article = await adminService.toggleArticlePublished(req.admin!.sub, req.params.id, isPublished);
    res.json({
      success: true,
      data: article
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update article' });
  }
});

// =============================================================================
// REPORTS MANAGEMENT ROUTES
// =============================================================================

// Get reports
router.get('/reports', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const result = await adminService.getReports(page, limit, status);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch reports' });
  }
});

// Update report status
router.patch('/reports/:id', adminAuth, requireRole('super_admin', 'admin', 'moderator'), async (req: AdminRequest, res: Response) => {
  try {
    const { status, resolutionNotes } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status required' });
    }

    const report = await adminService.updateReportStatus(
      req.admin!.sub,
      req.params.id,
      status,
      resolutionNotes
    );
    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update report' });
  }
});

// =============================================================================
// AUDIT LOGS ROUTES
// =============================================================================

// Get admin audit logs
router.get('/audit-logs', adminAuth, requireRole('super_admin', 'admin'), async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const adminId = req.query.adminId as string;
    const action = req.query.action as string;

    const result = await adminService.getAdminAuditLogs(page, limit, adminId, action);
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
  }
});

// =============================================================================
// PLATFORM SETTINGS ROUTES
// =============================================================================

// Get platform settings
router.get('/settings', adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const publicOnly = req.admin!.role === 'support';
    const settings = await adminService.getPlatformSettings(publicOnly);
    res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// Update platform setting
router.patch('/settings/:key', adminAuth, requireRole('super_admin'), async (req: AdminRequest, res: Response) => {
  try {
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'value required' });
    }

    const setting = await adminService.updatePlatformSetting(
      req.admin!.sub,
      req.params.key,
      String(value)
    );
    res.json({
      success: true,
      data: setting
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
});

// =============================================================================
// ADMIN USER MANAGEMENT ROUTES (Super Admin Only)
// =============================================================================

// Get admin users
router.get('/admins', adminAuth, requireRole('super_admin'), async (req: AdminRequest, res: Response) => {
  try {
    const admins = await adminService.getAdminUsers();
    res.json({
      success: true,
      data: admins
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch admins' });
  }
});

// Create admin user
router.post('/admins', adminAuth, requireRole('super_admin'), async (req: AdminRequest, res: Response) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;

    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ error: 'All fields required: email, password, first_name, last_name, role' });
    }

    const admin = await adminService.createAdminUser(req.admin!.sub, {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create admin' });
  }
});

// Update admin role
router.patch('/admins/:id/role', adminAuth, requireRole('super_admin'), async (req: AdminRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'role required' });
    }

    const admin = await adminService.updateAdminRole(req.admin!.sub, req.params.id, role);
    res.json({
      success: true,
      data: admin
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update admin role' });
  }
});

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// Trigger daily stats aggregation (for cron job)
router.post('/utils/aggregate-stats', adminAuth, requireRole('super_admin'), async (req: AdminRequest, res: Response) => {
  try {
    await adminService.aggregateDailyStats();
    res.json({
      success: true,
      message: 'Daily statistics aggregated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to aggregate stats' });
  }
});

export default router;
