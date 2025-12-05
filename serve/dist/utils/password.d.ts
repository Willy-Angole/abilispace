/**
 * Password Utility
 *
 * Secure password hashing and verification using Argon2id.
 * Argon2id is the winner of the Password Hashing Competition
 * and provides memory-hard hashing resistant to GPU attacks.
 */
/**
 * Hash a password using Argon2id
 *
 * @param password - Plain text password to hash
 * @returns Hashed password string
 *
 * Time Complexity: O(1) with respect to password length (memory-hard)
 * Space Complexity: O(m) where m is memory cost
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against its hash
 * Uses timing-safe comparison to prevent timing attacks
 *
 * @param hash - Stored password hash
 * @param password - Plain text password to verify
 * @returns True if password matches
 */
export declare function verifyPassword(hash: string, password: string): Promise<boolean>;
/**
 * Check if a hash needs to be rehashed
 * Useful when upgrading hash parameters
 *
 * @param hash - Password hash to check
 * @returns True if rehashing is recommended
 */
export declare function needsRehash(hash: string): boolean;
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
export declare function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
};
//# sourceMappingURL=password.d.ts.map