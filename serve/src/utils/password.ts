/**
 * Password Utility
 * 
 * Secure password hashing and verification using Argon2id.
 * Argon2id is the winner of the Password Hashing Competition
 * and provides memory-hard hashing resistant to GPU attacks.
 */

import argon2 from 'argon2';
import { logger } from './logger';

/**
 * Argon2id configuration
 * Settings based on OWASP recommendations for password storage
 */
const ARGON2_OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,      // 64 MB memory usage
    timeCost: 3,            // 3 iterations
    parallelism: 4,         // 4 parallel threads
    hashLength: 32,         // 32 byte output
};

/**
 * Hash a password using Argon2id
 * 
 * @param password - Plain text password to hash
 * @returns Hashed password string
 * 
 * Time Complexity: O(1) with respect to password length (memory-hard)
 * Space Complexity: O(m) where m is memory cost
 */
export async function hashPassword(password: string): Promise<string> {
    try {
        return await argon2.hash(password, { ...ARGON2_OPTIONS, raw: false });
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
        return await argon2.verify(hash, password);
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
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
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
