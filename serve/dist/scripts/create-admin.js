"use strict";
/**
 * Create Admin User Script
 *
 * Run with: npx ts-node src/scripts/create-admin.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const argon2_1 = __importDefault(require("argon2"));
const pool_1 = require("../database/pool");
async function createAdminUser() {
    const email = process.argv[2] || 'admin@shiriki.com';
    const password = process.argv[3] || 'Admin@123456';
    const firstName = process.argv[4] || 'Admin';
    const lastName = process.argv[5] || 'User';
    const role = process.argv[6] || 'super_admin';
    console.log('Creating admin user...');
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    try {
        // Hash the password
        const passwordHash = await argon2_1.default.hash(password, {
            type: argon2_1.default.argon2id,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 4,
        });
        // Check if admin already exists
        const existing = await pool_1.db.query('SELECT id FROM admin_users WHERE email = $1', { values: [email] });
        if (existing.rows.length > 0) {
            console.log('Admin user already exists. Updating password...');
            await pool_1.db.query('UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE email = $2', { values: [passwordHash, email] });
            console.log('Password updated successfully!');
        }
        else {
            // Create admin user
            const result = await pool_1.db.query(`INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING id, email, role`, { values: [email, passwordHash, firstName, lastName, role] });
            console.log('Admin user created successfully!');
            console.log('User ID:', result.rows[0].id);
        }
        console.log('\n--- Login Credentials ---');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Role: ${role}`);
        console.log('\nUse these credentials to log in at /admin');
    }
    catch (error) {
        console.error('Error creating admin user:', error.message);
        if (error.message.includes('admin_users')) {
            console.log('\nNote: Make sure you have run the admin-schema.sql migration first:');
            console.log('psql -d your_database -f src/database/admin-schema.sql');
        }
    }
    finally {
        process.exit(0);
    }
}
createAdminUser();
//# sourceMappingURL=create-admin.js.map