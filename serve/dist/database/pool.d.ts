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
import { PoolClient, QueryResult, QueryResultRow } from 'pg';
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
export declare class DatabasePool {
    private static instance;
    private pool;
    private isConnected;
    /**
     * Private constructor for Singleton pattern
     * Initializes connection pool with optimized settings
     */
    private constructor();
    /**
     * Get singleton instance
     * Thread-safe in Node.js single-threaded model
     */
    static getInstance(): DatabasePool;
    /**
     * Test database connection
     * Used during application startup
     */
    testConnection(): Promise<boolean>;
    /**
     * Execute a query with automatic connection management
     *
     * @param text - SQL query string
     * @param options - Query options including values and statement name
     * @returns Query result
     *
     * Time Complexity: O(1) for connection + O(query execution time)
     */
    query<T extends QueryResultRow = QueryResultRow>(text: string, options?: QueryOptions): Promise<QueryResult<T>>;
    /**
     * Get a client for transaction support
     * Caller is responsible for releasing the client
     */
    getClient(): Promise<PoolClient>;
    /**
     * Execute a transaction with automatic rollback on error
     *
     * @param callback - Function containing transaction queries
     * @returns Result of the transaction
     *
     * Implements the Template Method pattern for transactions
     */
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    /**
     * Execute multiple queries in a batch
     * Uses pipelining for better performance
     *
     * @param queries - Array of query objects
     * @returns Array of query results
     *
     * Time Complexity: O(n) where n is number of queries
     */
    batchQuery<T extends QueryResultRow = QueryResultRow>(queries: Array<{
        text: string;
        values?: unknown[];
    }>): Promise<Array<QueryResult<T>>>;
    /**
     * Close all connections in the pool
     * Call during graceful shutdown
     */
    close(): Promise<void>;
    /**
     * Get pool statistics for monitoring
     */
    getStats(): {
        total: number;
        idle: number;
        waiting: number;
    };
}
export declare const db: DatabasePool;
export {};
//# sourceMappingURL=pool.d.ts.map