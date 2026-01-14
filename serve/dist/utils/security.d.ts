/**
 * Security Utilities for Shiriki Backend
 *
 * Provides input sanitization, CSRF protection, and security helpers.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Sanitize string input to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 */
export declare function sanitizeString(input: string): string;
/**
 * Sanitize object recursively
 * Applies sanitization to all string values in an object
 */
export declare function sanitizeObject<T extends Record<string, unknown>>(obj: T): T;
/**
 * Validate and sanitize email address
 */
export declare function sanitizeEmail(email: string): string | null;
/**
 * Validate UUID format
 */
export declare function isValidUUID(uuid: string): boolean;
/**
 * Sanitize SQL-like input to prevent injection
 * NOTE: Always use parameterized queries! This is a secondary defense.
 */
export declare function sanitizeSQLInput(input: string): string;
/**
 * Generate CSRF token
 */
export declare function generateCSRFToken(): string;
/**
 * Create CSRF token and associate with session/user
 */
export declare function createCSRFToken(sessionId: string): string;
/**
 * Validate CSRF token
 */
export declare function validateCSRFToken(sessionId: string, token: string): boolean;
/**
 * CSRF middleware
 * Validates CSRF token on state-changing requests
 */
export declare function csrfMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * Endpoint to get a CSRF token
 * Call this on app load to get a token for subsequent requests
 */
export declare function getCSRFTokenHandler(req: Request, res: Response): void;
/**
 * Additional security headers middleware
 */
export declare function securityHeaders(_req: Request, res: Response, next: NextFunction): void;
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
export declare function validatePasswordStrength(password: string): PasswordValidationResult;
/**
 * Cleanup expired CSRF tokens periodically
 */
export declare function cleanupCSRFTokens(): void;
//# sourceMappingURL=security.d.ts.map