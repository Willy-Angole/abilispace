/**
 * Authentication Middleware
 * 
 * Handles JWT verification and user context injection.
 * Implements the Chain of Responsibility pattern for auth checks.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractBearerToken, TokenPayload } from '../utils/jwt';
import { logger } from '../utils/logger';

/**
 * Extended Request interface with user context
 */
export interface AuthenticatedRequest extends Request {
    user?: TokenPayload;
    userId?: string;
}

/**
 * Middleware to verify JWT and attach user to request
 * Rejects unauthorized requests with 401 status
 */
export function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'UNAUTHORIZED',
        });
        return;
    }

    const payload = verifyAccessToken(token);

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
export function optionalAuthenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
        const payload = verifyAccessToken(token);
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
export function requireRole(...allowedRoles: string[]) {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): void => {
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
            logger.warn('Access denied - insufficient permissions', {
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
export function hasuraWebhookAuth(
    req: Request,
    res: Response,
    next: NextFunction
): void {
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
