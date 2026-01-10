/**
 * Password Utility
 * 
 * Secure password hashing and verification using bcrypt.
 * bcrypt is a battle-tested password hashing algorithm that
 * provides adaptive cost factor for future-proofing.
 */

import bcrypt from 'bcrypt';
import { logger } from './logger';
import { config } from '../config/environment';

/**
 * Bcrypt configuration
 * Using the BCRYPT_ROUNDS from environment config
 * Default: 12 rounds (OWASP recommended minimum is 10)
 */
const BCRYPT_ROUNDS = config.security.bcryptRounds;

/**
 * Hash a password using bcrypt
 * 
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
    try {
        return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
        logger.error('Password hashing failed:', error);
        throw new Error('Password hashing failed');
    }
}

/**
 * Verify a password against its hash
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param hash - Stored password hash
 * @param password - Plain text password to verify
 * @returns True if password matches
 */
export async function verifyPassword(
    hash: string,
    password: string
): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        logger.error('Password verification failed:', error);
        return false;
    }
}

/**
 * Check if a hash needs to be rehashed
 * Useful when upgrading hash parameters
 * 
 * @param hash - Password hash to check
 * @returns True if rehashing is recommended
 */
export function needsRehash(hash: string): boolean {
    try {
        const hashRounds = bcrypt.getRounds(hash);
        return hashRounds < BCRYPT_ROUNDS;
    } catch {
        return true;
    }
}

/**
 * Validate password strength
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param password - Password to validate
 * @returns Object with isValid flag and validation errors
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}
