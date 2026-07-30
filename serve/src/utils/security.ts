/**
 * Security Utilities for Shiriki Backend
 * 
 * Provides input sanitization, CSRF protection, and security helpers.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ==========================================
// INPUT SANITIZATION
// ==========================================

/**
 * Sanitize string input to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
        // Remove null bytes
        .replace(/\0/g, '')
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        // Remove potential script injection
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        // Trim whitespace
        .trim();
}

/**
 * Sanitize object recursively
 * Applies sanitization to all string values in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map((item) =>
                typeof item === 'string' ? sanitizeString(item) : item
            );
        } else if (value && typeof value === 'object') {
            sanitized[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized as T;
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
    const sanitized = sanitizeString(email).toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(sanitized)) {
        return null;
    }
    
    return sanitized;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Sanitize SQL-like input to prevent injection
 * NOTE: Always use parameterized queries! This is a secondary defense.
 */
export function sanitizeSQLInput(input: string): string {
    return input
        .replace(/'/g, "''")
        .replace(/;/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '');
}

// ==========================================
// CSRF PROTECTION
// ==========================================

/**
 * CSRF token store (in-memory for simplicity, use Redis in production)
 */
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create CSRF token and associate with session/user
 */
export function createCSRFToken(sessionId: string): string {
    const token = generateCSRFToken();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    
    csrfTokens.set(sessionId, { token, expiresAt });
    
    return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
    const stored = csrfTokens.get(sessionId);
    
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
        csrfTokens.delete(sessionId);
        return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(stored.token),
            Buffer.from(token)
        );
    } catch {
        return false;
    }
}

/**
 * Paths that establish a session and must remain CSRF-exempt.
 */
const CSRF_EXEMPT_PATHS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/google',
    '/auth/request-reset',
    '/auth/verify-reset-code',
    '/auth/reset-password',
    '/admin/auth/login',
    '/csrf-token',
];

/**
 * CSRF middleware for cookie-authenticated mutating requests.
 *
 * Bearer-only clients (Authorization header) are exempt: classic CSRF
 * requires the browser to auto-send cookies; custom headers are not sent
 * cross-site without CORS preflight.
 *
 * Enforcement only when an auth cookie is present (established session).
 */
export function csrfMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const path = req.path || '';
    if (CSRF_EXEMPT_PATHS.some((p) => path === p || path.endsWith(p))) {
        return next();
    }

    // Bearer auth is not vulnerable to classic cookie CSRF
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        return next();
    }

    // Only enforce when browser would auto-send session cookies
    const cookies = req.headers.cookie || '';
    const hasSessionCookie =
        cookies.includes('abilispace_access=') ||
        cookies.includes('abilispace_admin_access=');

    if (!hasSessionCookie) {
        // No cookie session — nothing to CSRF against (client must use Bearer)
        return next();
    }

    const sessionId =
        (req as Request & { userId?: string }).userId || req.ip || 'unknown';
    const csrfToken = req.headers['x-csrf-token'] as string;

    if (!csrfToken || !validateCSRFToken(sessionId, csrfToken)) {
        res.status(403).json({
            success: false,
            message: 'Invalid or missing CSRF token',
            code: 'CSRF_VALIDATION_FAILED',
        });
        return;
    }

    next();
}

/**
 * Endpoint to get a CSRF token for cookie-authenticated forms/SPA.
 */
export function getCSRFTokenHandler(req: Request, res: Response): void {
    const sessionId =
        (req as Request & { userId?: string }).userId || req.ip || 'unknown';
    const token = createCSRFToken(sessionId);

    res.json({
        success: true,
        csrfToken: token,
    });
}

// ==========================================
// SECURITY HEADERS
// ==========================================

/**
 * Additional security headers middleware
 */
export function securityHeaders(
    _req: Request,
    res: Response,
    next: NextFunction
): void {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS protection for older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy — camera/mic allowed for messaging voice notes only via feature policy refinement
    res.setHeader(
        'Permissions-Policy',
        'geolocation=(), payment=()'
    );
    
    // HSTS in production (requires HTTPS termination)
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
}

// ==========================================
// PASSWORD VALIDATION (single source — re-export from password utils)
// ==========================================

export {
    validatePasswordStrength,
    type PasswordValidationResult,
} from './password';

// ==========================================
// CLEANUP
// ==========================================

/**
 * Cleanup expired CSRF tokens periodically
 */
export function cleanupCSRFTokens(): void {
    const now = Date.now();
    
    for (const [key, value] of csrfTokens.entries()) {
        if (value.expiresAt < now) {
            csrfTokens.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupCSRFTokens, 5 * 60 * 1000);
