/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring service health.
 * Implements Kubernetes-style liveness and readiness probes.
 */

import { Router, Request, Response, IRouter } from 'express';
import { db } from '../database/pool';
import { asyncHandler } from '../middleware/error-handler';

const router: IRouter = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
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
router.get('/live', (_req: Request, res: Response) => {
    res.json({
        status: 'alive',
    });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Returns 200 if the service can accept traffic
 */
router.get(
    '/ready',
    asyncHandler(async (_req: Request, res: Response) => {
        // Check database connection
        const dbStats = db.getStats();
        
        // Perform a simple query to verify database is responsive
        try {
            await db.query('SELECT 1');
        } catch (error) {
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
    })
);

/**
 * GET /health/detailed
 * Detailed health information (admin only in production)
 */
router.get(
    '/detailed',
    asyncHandler(async (_req: Request, res: Response) => {
        const dbStats = db.getStats();

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
    })
);

export default router;
