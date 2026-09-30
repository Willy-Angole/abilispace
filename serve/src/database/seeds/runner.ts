/**
 * Seed runner — applies seeds.sql if present.
 * Usage: pnpm seed
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { databaseSsl } from '../ssl';

dotenv.config();

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL is required');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseSsl(databaseUrl),
    });

    const seedsPath = path.join(__dirname, '..', 'seeds.sql');
    if (!fs.existsSync(seedsPath)) {
        console.log('No seeds.sql found — nothing to do');
        await pool.end();
        return;
    }

    const sql = fs.readFileSync(seedsPath, 'utf8');
    console.log('Applying seeds.sql...');
    await pool.query(sql);
    console.log('Seeds applied');
    await pool.end();
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
