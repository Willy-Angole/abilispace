"use strict";
/**
 * Security Utilities for Shiriki Backend
 *
 * Provides input sanitization, CSRF protection, and security helpers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = sanitizeString;
exports.sanitizeObject = sanitizeObject;
exports.sanitizeEmail = sanitizeEmail;
exports.isValidUUID = isValidUUID;
exports.sanitizeSQLInput = sanitizeSQLInput;
exports.generateCSRFToken = generateCSRFToken;
exports.createCSRFToken = createCSRFToken;
exports.validateCSRFToken = validateCSRFToken;
exports.csrfMiddleware = csrfMiddleware;
exports.getCSRFTokenHandler = getCSRFTokenHandler;
exports.securityHeaders = securityHeaders;
exports.validatePasswordStrength = validatePasswordStrength;
exports.cleanupCSRFTokens = cleanupCSRFTokens;
const crypto_1 = __importDefault(require("crypto"));
// ==========================================
// INPUT SANITIZATION
// ==========================================
/**
 * Sanitize string input to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 */
function sanitizeString(input) {
    if (typeof input !== 'string')
        return '';
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
function sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        }
        else if (Array.isArray(value)) {
            sanitized[key] = value.map((item) => typeof item === 'string' ? sanitizeString(item) : item);
        }
        else if (value && typeof value === 'object') {
            sanitized[key] = sanitizeObject(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/**
 * Validate and sanitize email address
 */
function sanitizeEmail(email) {
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
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
/**
 * Sanitize SQL-like input to prevent injection
 * NOTE: Always use parameterized queries! This is a secondary defense.
 */
function sanitizeSQLInput(input) {
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
const csrfTokens = new Map();
/**
 * Generate CSRF token
 */
function generateCSRFToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Create CSRF token and associate with session/user
 */
function createCSRFToken(sessionId) {
    const token = generateCSRFToken();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    csrfTokens.set(sessionId, { token, expiresAt });
    return token;
}
/**
 * Validate CSRF token
 */
function validateCSRFToken(sessionId, token) {
    const stored = csrfTokens.get(sessionId);
    if (!stored)
        return false;
    if (Date.now() > stored.expiresAt) {
        csrfTokens.delete(sessionId);
        return false;
    }
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(stored.token), Buffer.from(token));
    }
    catch {
        return false;
    }
}
/**
 * CSRF middleware
 * Validates CSRF token on state-changing requests
 */
function csrfMiddleware(req, res, next) {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    // Get session ID from auth token or generate one
    const sessionId = req.userId || req.ip || 'unknown';
    const csrfToken = req.headers['x-csrf-token'];
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
function getCSRFTokenHandler(req, res) {
    const sessionId = req.userId || req.ip || 'unknown';
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
function securityHeaders(_req, res, next) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS protection for older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    // HSTS (uncomment in production with HTTPS)
    // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
}
/**
 * Validate password strength
 * Checks for length, complexity, and common patterns
 */
function validatePasswordStrength(password) {
    const errors = [];
    let score = 0;
    // Length check
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    else if (password.length >= 12) {
        score += 2;
    }
    else {
        score += 1;
    }
    // Uppercase check
    if (/[A-Z]/.test(password)) {
        score += 1;
    }
    else {
        errors.push('Password must contain at least one uppercase letter');
    }
    // Lowercase check
    if (/[a-z]/.test(password)) {
        score += 1;
    }
    else {
        errors.push('Password must contain at least one lowercase letter');
    }
    // Number check
    if (/[0-9]/.test(password)) {
        score += 1;
    }
    else {
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
function cleanupCSRFTokens() {
    const now = Date.now();
    for (const [key, value] of csrfTokens.entries()) {
        if (value.expiresAt < now) {
            csrfTokens.delete(key);
        }
    }
}
// Run cleanup every 5 minutes
setInterval(cleanupCSRFTokens, 5 * 60 * 1000);
//# sourceMappingURL=security.js.map