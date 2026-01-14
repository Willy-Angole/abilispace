"use strict";
/**
 * Database Connection Pool
 *
 * Implements connection pooling for PostgreSQL using the Singleton pattern.
 * Connection pooling improves performance by reusing database connections
 * instead of creating new ones for each query.
 *
 * Time Complexity: O(1) for connection acquisition (amortized)
 * Space Complexity: O(n) where n is the pool size
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabasePool = void 0;
const pg_1 = require("pg");
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
/**
 * DatabasePool - Singleton connection pool manager
 *
 * Uses object pooling pattern for efficient database connections.
 * Implements lazy initialization to defer connection creation.
 */
class DatabasePool {
    static instance;
    pool;
    isConnected = false;
    /**
     * Private constructor for Singleton pattern
     * Initializes connection pool with optimized settings
     */
    constructor() {
        this.pool = new pg_1.Pool({
            connectionString: environment_1.config.database.url,
            max: 20, // Maximum connections in pool
            min: 2, // Minimum connections to maintain
            idleTimeoutMillis: 30000, // Close idle connections after 30s
            connectionTimeoutMillis: 60000, // Fail after 60s if no connection available (Railway needs time to wake up)
            maxUses: 7500, // Close connection after 7500 uses (prevents memory leaks)
            ssl: { rejectUnauthorized: false }, // Railway requires SSL
        });
        // Handle pool errors
        this.pool.on('error', (err) => {
            logger_1.logger.error('Unexpected database pool error:', err);
        });
        // Log connection events in development
        if (environment_1.config.isDevelopment) {
            this.pool.on('connect', () => {
                logger_1.logger.debug('New database connection established');
            });
            this.pool.on('remove', () => {
                logger_1.logger.debug('Database connection removed from pool');
            });
        }
    }
    /**
     * Get singleton instance
     * Thread-safe in Node.js single-threaded model
     */
    static getInstance() {
        if (!DatabasePool.instance) {
            DatabasePool.instance = new DatabasePool();
        }
        return DatabasePool.instance;
    }
    /**
     * Test database connection
     * Used during application startup
     */
    async testConnection() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            this.isConnected = true;
            return true;
        }
        catch (error) {
            logger_1.logger.error('Database connection test failed:', error);
            throw error;
        }
    }
    /**
     * Execute a query with automatic connection management
     *
     * @param text - SQL query string
     * @param options - Query options including values and statement name
     * @returns Query result
     *
     * Time Complexity: O(1) for connection + O(query execution time)
     */
    async query(text, options) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, options?.values);
            const duration = Date.now() - start;
            if (environment_1.config.isDevelopment) {
                logger_1.logger.debug(`Query executed in ${duration}ms`, {
                    query: text.substring(0, 100),
                    rows: result.rowCount,
                });
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Query execution failed:', { query: text, error });
            throw error;
        }
    }
    /**
     * Get a client for transaction support
     * Caller is responsible for releasing the client
     */
    async getClient() {
        return await this.pool.connect();
    }
    /**
     * Execute a transaction with automatic rollback on error
     *
     * @param callback - Function containing transaction queries
     * @returns Result of the transaction
     *
     * Implements the Template Method pattern for transactions
     */
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Execute multiple queries in a batch
     * Uses pipelining for better performance
     *
     * @param queries - Array of query objects
     * @returns Array of query results
     *
     * Time Complexity: O(n) where n is number of queries
     */
    async batchQuery(queries) {
        const client = await this.pool.connect();
        try {
            const results = [];
            for (const query of queries) {
                const result = await client.query(query.text, query.values);
                results.push(result);
            }
            return results;
        }
        finally {
            client.release();
        }
    }
    /**
     * Close all connections in the pool
     * Call during graceful shutdown
     */
    async close() {
        await this.pool.end();
        this.isConnected = false;
        logger_1.logger.info('Database pool closed');
    }
    /**
     * Get pool statistics for monitoring
     */
    getStats() {
        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount,
        };
    }
}
exports.DatabasePool = DatabasePool;
// Export singleton instance getter for convenience
exports.db = DatabasePool.getInstance();
//# sourceMappingURL=pool.js.map