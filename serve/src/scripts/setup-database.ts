/**
 * Database Setup Script
 * Runs the schema and admin schema SQL files to set up the database
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable is required');
        process.exit(1);
    }

    console.log('🚀 Starting database setup...');
    
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Read and execute main schema
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📦 Running main schema...');
        await pool.query(schemaSQL);
        console.log('✅ Main schema applied successfully');

        // Read and execute admin schema
        const adminSchemaPath = path.join(__dirname, '../database/admin-schema.sql');
        const adminSchemaSQL = fs.readFileSync(adminSchemaPath, 'utf8');
        
        console.log('📦 Running admin schema...');
        await pool.query(adminSchemaSQL);
        console.log('✅ Admin schema applied successfully');

        console.log('🎉 Database setup completed successfully!');
    } catch (error: any) {
        // Check if it's a "already exists" type error (which is okay)
        if (error.code === '42710' || error.code === '42P07') {
            console.log('ℹ️  Some objects already exist (this is okay for incremental updates)');
            console.log('🎉 Database setup completed!');
        } else {
            console.error('❌ Database setup failed:', error.message);
            process.exit(1);
        }
    } finally {
        await pool.end();
    }
}

setupDatabase();
