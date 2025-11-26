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

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Query options interface
 */
interface QueryOptions {
    values?: unknown[];
    name?: string;
}

/**
 * DatabasePool - Singleton connection pool manager
 * 
 * Uses object pooling pattern for efficient database connections.
 * Implements lazy initialization to defer connection creation.
 */
export class DatabasePool {
    private static instance: DatabasePool;
    private pool: Pool;
    private isConnected: boolean = false;

    /**
     * Private constructor for Singleton pattern
     * Initializes connection pool with optimized settings
     */
    private constructor() {
        this.pool = new Pool({
            connectionString: config.database.url,
            max: 20, // Maximum connections in pool
            min: 2,  // Minimum connections to maintain
            idleTimeoutMillis: 30000, // Close idle connections after 30s
            connectionTimeoutMillis: 5000, // Fail after 5s if no connection available
            maxUses: 7500, // Close connection after 7500 uses (prevents memory leaks)
        });

        // Handle pool errors
        this.pool.on('error', (err: Error) => {
            logger.error('Unexpected database pool error:', err);
        });

        // Log connection events in development
        if (config.isDevelopment) {
            this.pool.on('connect', () => {
                logger.debug('New database connection established');
            });

            this.pool.on('remove', () => {
                logger.debug('Database connection removed from pool');
            });
        }
    }

    /**
     * Get singleton instance
     * Thread-safe in Node.js single-threaded model
     */
    public static getInstance(): DatabasePool {
        if (!DatabasePool.instance) {
            DatabasePool.instance = new DatabasePool();
        }
        return DatabasePool.instance;
    }

    /**
     * Test database connection
     * Used during application startup
     */
    public async testConnection(): Promise<boolean> {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            this.isConnected = true;
            return true;
        } catch (error) {
            logger.error('Database connection test failed:', error);
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
    public async query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        options?: QueryOptions
    ): Promise<QueryResult<T>> {
        const start = Date.now();
        
        try {
            const result = await this.pool.query<T>(text, options?.values);
            
            const duration = Date.now() - start;
            if (config.isDevelopment) {
                logger.debug(`Query executed in ${duration}ms`, {
                    query: text.substring(0, 100),
                    rows: result.rowCount,
                });
            }
            
            return result;
        } catch (error) {
            logger.error('Query execution failed:', { query: text, error });
            throw error;
        }
    }

    /**
     * Get a client for transaction support
     * Caller is responsible for releasing the client
     */
    public async getClient(): Promise<PoolClient> {
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
    public async transaction<T>(
        callback: (client: PoolClient) => Promise<T>
    ): Promise<T> {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
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
    public async batchQuery<T extends QueryResultRow = QueryResultRow>(
        queries: Array<{ text: string; values?: unknown[] }>
    ): Promise<Array<QueryResult<T>>> {
        const client = await this.pool.connect();
        
        try {
            const results: Array<QueryResult<T>> = [];
            
            for (const query of queries) {
                const result = await client.query<T>(query.text, query.values);
                results.push(result);
            }
            
            return results;
        } finally {
            client.release();
        }
    }

    /**
     * Close all connections in the pool
     * Call during graceful shutdown
     */
    public async close(): Promise<void> {
        await this.pool.end();
        this.isConnected = false;
        logger.info('Database pool closed');
    }

    /**
     * Get pool statistics for monitoring
     */
    public getStats(): {
        total: number;
        idle: number;
        waiting: number;
    } {
        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount,
        };
    }
}

// Export singleton instance getter for convenience
export const db = DatabasePool.getInstance();
