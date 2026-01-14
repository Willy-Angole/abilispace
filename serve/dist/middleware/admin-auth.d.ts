/**
 * Admin Authentication Middleware
 *
 * Provides middleware functions for admin authentication and authorization.
 * Supports role-based access control for different admin levels.
 */
import { Request, Response, NextFunction } from 'express';
export interface AdminTokenPayload {
    sub: string;
    email: string;
    role: 'super_admin' | 'admin' | 'moderator' | 'support';
    type: 'admin';
    iat: number;
    exp: number;
}
export interface AdminRequest extends Request {
    admin?: AdminTokenPayload;
}
/**
 * Verify admin JWT token and attach admin data to request
 */
export declare const verifyAdminToken: (req: AdminRequest, res: Response, next: NextFunction) => Promise<void | Response>;
/**
 * Require specific admin roles
 * Usage: requireAdminRole('admin', 'super_admin')
 */
export declare const requireAdminRole: (...allowedRoles: string[]) => (req: AdminRequest, res: Response, next: NextFunction) => void | Response;
/**
 * Require minimum admin role level
 * Usage: requireMinimumRole('moderator') - allows moderator, admin, super_admin
 */
export declare const requireMinimumRole: (minimumRole: string) => (req: AdminRequest, res: Response, next: NextFunction) => void | Response;
/**
 * Check if admin can modify another admin
 * Super admins can modify anyone, admins can modify moderators/support
 */
export declare const canModifyAdmin: (currentRole: string, targetRole: string) => boolean;
/**
 * Log admin action for audit trail
 */
export declare const logAdminAction: (adminId: string, action: string, entityType: string, entityId: string | null, description?: string, ipAddress?: string, userAgent?: string, oldValues?: any, newValues?: any) => Promise<void>;
/**
 * Middleware to log all admin actions
 */
export declare const auditAdminAction: (action: string, entityType: string) => (req: AdminRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Rate limiter specifically for admin endpoints
 */
export declare const adminRateLimiter: (maxRequests?: number, windowMs?: number) => (req: AdminRequest, res: Response, next: NextFunction) => void | Response;
declare const _default: {
    verifyAdminToken: (req: AdminRequest, res: Response, next: NextFunction) => Promise<void | Response>;
    requireAdminRole: (...allowedRoles: string[]) => (req: AdminRequest, res: Response, next: NextFunction) => void | Response;
    requireMinimumRole: (minimumRole: string) => (req: AdminRequest, res: Response, next: NextFunction) => void | Response;
    canModifyAdmin: (currentRole: string, targetRole: string) => boolean;
    logAdminAction: (adminId: string, action: string, entityType: string, entityId: string | null, description?: string, ipAddress?: string, userAgent?: string, oldValues?: any, newValues?: any) => Promise<void>;
    auditAdminAction: (action: string, entityType: string) => (req: AdminRequest, res: Response, next: NextFunction) => Promise<void>;
    adminRateLimiter: (maxRequests?: number, windowMs?: number) => (req: AdminRequest, res: Response, next: NextFunction) => void | Response;
};
export default _default;
//# sourceMappingURL=admin-auth.d.ts.map