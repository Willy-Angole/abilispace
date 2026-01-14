/**
 * Authentication Middleware
 *
 * Handles JWT verification and user context injection.
 * Implements the Chain of Responsibility pattern for auth checks.
 */
import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt';
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
export declare function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Optional authentication middleware
 * Attaches user if token is valid but doesn't reject if missing
 */
export declare function optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Role-based access control middleware factory
 * Creates middleware that checks for required roles
 *
 * @param allowedRoles - Array of roles that can access the route
 */
export declare function requireRole(...allowedRoles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Hasura webhook authentication handler
 * Validates Hasura admin secret for action handlers
 */
export declare function hasuraWebhookAuth(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map