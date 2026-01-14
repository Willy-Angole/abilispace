"use strict";
/**
 * Health Check Routes
 *
 * Provides endpoints for monitoring service health.
 * Implements Kubernetes-style liveness and readiness probes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pool_1 = require("../database/pool");
const error_handler_1 = require("../middleware/error-handler");
const router = (0, express_1.Router)();
/**
 * GET /health
 * Basic health check
 */
router.get('/', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'shiriki-api',
    });
});
/**
 * GET /health/live
 * Kubernetes liveness probe
 * Returns 200 if the service is running
 */
router.get('/live', (_req, res) => {
    res.json({
        status: 'alive',
    });
});
/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Returns 200 if the service can accept traffic
 */
router.get('/ready', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    // Check database connection
    const dbStats = pool_1.db.getStats();
    // Perform a simple query to verify database is responsive
    try {
        await pool_1.db.query('SELECT 1');
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            reason: 'Database connection failed',
        });
        return;
    }
    res.json({
        status: 'ready',
        database: {
            totalConnections: dbStats.total,
            idleConnections: dbStats.idle,
            waitingRequests: dbStats.waiting,
        },
    });
}));
/**
 * GET /health/detailed
 * Detailed health information (admin only in production)
 */
router.get('/detailed', (0, error_handler_1.asyncHandler)(async (_req, res) => {
    const dbStats = pool_1.db.getStats();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: {
            totalConnections: dbStats.total,
            idleConnections: dbStats.idle,
            waitingRequests: dbStats.waiting,
        },
    });
}));
exports.default = router;
//# sourceMappingURL=health.routes.js.map