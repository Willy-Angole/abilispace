"use strict";
/**
 * Admin Authentication Middleware
 *
 * Provides middleware functions for admin authentication and authorization.
 * Supports role-based access control for different admin levels.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRateLimiter = exports.auditAdminAction = exports.logAdminAction = exports.canModifyAdmin = exports.requireMinimumRole = exports.requireAdminRole = exports.verifyAdminToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const pool_1 = require("../database/pool");
// Environment shorthand
const JWT_SECRET = environment_1.config.jwt.secret;
// Admin roles hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = {
    support: 1,
    moderator: 2,
    admin: 3,
    super_admin: 4,
};
/**
 * Verify admin JWT token and attach admin data to request
 */
const verifyAdminToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access token required',
                code: 'MISSING_TOKEN',
            });
        }
        const token = authHeader.split(' ')[1];
        // Verify JWT
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Ensure it's an admin token
        if (payload.type !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                code: 'NOT_ADMIN',
            });
        }
        // Verify admin still exists and is active
        const adminResult = await pool_1.db.query(`SELECT id, email, role, is_active FROM admin_users 
       WHERE id = $1 AND deleted_at IS NULL`, { values: [payload.sub] });
        if (adminResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Admin account not found',
                code: 'ADMIN_NOT_FOUND',
            });
        }
        const admin = adminResult.rows[0];
        if (!admin.is_active) {
            return res.status(403).json({
                success: false,
                error: 'Admin account is disabled',
                code: 'ADMIN_DISABLED',
            });
        }
        // Attach admin to request
        req.admin = {
            ...payload,
            role: admin.role, // Use current role from DB (might have changed)
        };
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED',
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                code: 'INVALID_TOKEN',
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            code: 'AUTH_ERROR',
        });
    }
};
exports.verifyAdminToken = verifyAdminToken;
/**
 * Require specific admin roles
 * Usage: requireAdminRole('admin', 'super_admin')
 */
const requireAdminRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NOT_AUTHENTICATED',
            });
        }
        if (!allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                required: allowedRoles,
                current: req.admin.role,
            });
        }
        next();
    };
};
exports.requireAdminRole = requireAdminRole;
/**
 * Require minimum admin role level
 * Usage: requireMinimumRole('moderator') - allows moderator, admin, super_admin
 */
const requireMinimumRole = (minimumRole) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NOT_AUTHENTICATED',
            });
        }
        const currentLevel = ROLE_HIERARCHY[req.admin.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
        if (currentLevel < requiredLevel) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                required: minimumRole,
                current: req.admin.role,
            });
        }
        next();
    };
};
exports.requireMinimumRole = requireMinimumRole;
/**
 * Check if admin can modify another admin
 * Super admins can modify anyone, admins can modify moderators/support
 */
const canModifyAdmin = (currentRole, targetRole) => {
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
    // Can only modify admins with lower role level
    return currentLevel > targetLevel;
};
exports.canModifyAdmin = canModifyAdmin;
/**
 * Log admin action for audit trail
 */
const logAdminAction = async (adminId, action, entityType, entityId, description, ipAddress, userAgent, oldValues, newValues) => {
    try {
        await pool_1.db.query(`INSERT INTO admin_audit_logs 
       (admin_id, action, entity_type, entity_id, description, ip_address, user_agent, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, {
            values: [
                adminId,
                action,
                entityType,
                entityId,
                description,
                ipAddress,
                userAgent,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
            ]
        });
    }
    catch (error) {
        // Log to console but don't fail the request
        console.error('Failed to log admin action:', error);
    }
};
exports.logAdminAction = logAdminAction;
/**
 * Middleware to log all admin actions
 */
const auditAdminAction = (action, entityType) => {
    return async (req, res, next) => {
        // Store original send
        const originalSend = res.send;
        // Override send to capture response
        res.send = function (body) {
            // Only log successful actions
            if (res.statusCode >= 200 && res.statusCode < 300 && req.admin) {
                const entityId = req.params.id || req.body?.id || null;
                (0, exports.logAdminAction)(req.admin.sub, action, entityType, entityId, undefined, req.ip || req.socket.remoteAddress, req.headers['user-agent']);
            }
            return originalSend.call(this, body);
        };
        next();
    };
};
exports.auditAdminAction = auditAdminAction;
/**
 * Rate limiter specifically for admin endpoints
 */
const adminRateLimiter = (maxRequests = 100, windowMs = 60000) => {
    const requests = new Map();
    return (req, res, next) => {
        const identifier = req.admin?.sub || req.ip || 'unknown';
        const now = Date.now();
        const record = requests.get(identifier);
        if (record && record.resetTime > now) {
            if (record.count >= maxRequests) {
                return res.status(429).json({
                    success: false,
                    error: 'Too many requests',
                    code: 'RATE_LIMITED',
                    retryAfter: Math.ceil((record.resetTime - now) / 1000),
                });
            }
            record.count++;
        }
        else {
            requests.set(identifier, {
                count: 1,
                resetTime: now + windowMs,
            });
        }
        // Cleanup old entries periodically
        if (Math.random() < 0.01) {
            for (const [key, value] of requests.entries()) {
                if (value.resetTime <= now) {
                    requests.delete(key);
                }
            }
        }
        next();
    };
};
exports.adminRateLimiter = adminRateLimiter;
exports.default = {
    verifyAdminToken: exports.verifyAdminToken,
    requireAdminRole: exports.requireAdminRole,
    requireMinimumRole: exports.requireMinimumRole,
    canModifyAdmin: exports.canModifyAdmin,
    logAdminAction: exports.logAdminAction,
    auditAdminAction: exports.auditAdminAction,
    adminRateLimiter: exports.adminRateLimiter,
};
//# sourceMappingURL=admin-auth.js.map