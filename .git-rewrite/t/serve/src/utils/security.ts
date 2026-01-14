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
 * CSRF middleware
 * Validates CSRF token on state-changing requests
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
    
    // Get session ID from auth token or generate one
    const sessionId = (req as any).userId || req.ip || 'unknown';
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
 * Endpoint to get a CSRF token
 * Call this on app load to get a token for subsequent requests
 */
export function getCSRFTokenHandler(req: Request, res: Response): void {
    const sessionId = (req as any).userId || req.ip || 'unknown';
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
    
    // Permissions Policy
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
    );
    
    // HSTS (uncomment in production with HTTPS)
    // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    next();
}

// ==========================================
// PASSWORD VALIDATION
// ==========================================

/**
 * Password strength requirements
 */
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    score: number;
}

/**
 * Validate password strength
 * Checks for length, complexity, and common patterns
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;
    
    // Length check
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
        score += 2;
    } else {
        score += 1;
    }
    
    // Uppercase check
    if (/[A-Z]/.test(password)) {
        score += 1;
    } else {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    // Lowercase check
    if (/[a-z]/.test(password)) {
        score += 1;
    } else {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    // Number check
    if (/[0-9]/.test(password)) {
        score += 1;
    } else {
        errors.push('Password must contain at least one number');
    }
    
    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        score += 1;
    }
    
    // Common password patterns check
    const commonPatterns = [
        /^(password|123456|qwerty|abc123|admin|letmein|welcome)/i,
        /(.)\1{3,}/, // Repeated characters
        /^[0-9]+$/, // Only numbers
        /^[a-zA-Z]+$/, // Only letters
    ];
    
    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            score -= 1;
            errors.push('Password contains a common pattern');
            break;
        }
    }
    
    return {
        isValid: errors.length === 0 && score >= 3,
        errors,
        score: Math.max(0, Math.min(5, score)),
    };
}

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
