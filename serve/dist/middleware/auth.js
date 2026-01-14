"use strict";
/**
 * Authentication Middleware
 *
 * Handles JWT verification and user context injection.
 * Implements the Chain of Responsibility pattern for auth checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuthenticate = optionalAuthenticate;
exports.requireRole = requireRole;
exports.hasuraWebhookAuth = hasuraWebhookAuth;
const jwt_1 = require("../utils/jwt");
const logger_1 = require("../utils/logger");
/**
 * Middleware to verify JWT and attach user to request
 * Rejects unauthorized requests with 401 status
 */
function authenticate(req, res, next) {
    const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
        });
        return;
    }
    const payload = (0, jwt_1.verifyAccessToken)(token);
    if (!payload) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
        });
        return;
    }
    // Attach user info to request
    req.user = payload;
    req.userId = payload.sub;
    next();
}
/**
 * Optional authentication middleware
 * Attaches user if token is valid but doesn't reject if missing
 */
function optionalAuthenticate(req, res, next) {
    const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
    if (token) {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        if (payload) {
            req.user = payload;
            req.userId = payload.sub;
        }
    }
    next();
}
/**
 * Role-based access control middleware factory
 * Creates middleware that checks for required roles
 *
 * @param allowedRoles - Array of roles that can access the route
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
            });
            return;
        }
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            logger_1.logger.warn('Access denied - insufficient permissions', {
                userId: req.userId,
                userRole,
                requiredRoles: allowedRoles,
            });
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'FORBIDDEN',
            });
            return;
        }
        next();
    };
}
/**
 * Hasura webhook authentication handler
 * Validates Hasura admin secret for action handlers
 */
function hasuraWebhookAuth(req, res, next) {
    const adminSecret = req.headers['x-hasura-admin-secret'];
    const expectedSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
    if (!adminSecret || adminSecret !== expectedSecret) {
        res.status(401).json({
            message: 'Unauthorized webhook request',
        });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map