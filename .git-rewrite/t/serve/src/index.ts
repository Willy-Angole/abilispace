/**
 * Shiriki Backend - Application Entry Point
 * 
 * This is the main entry point for the Shiriki backend service.
 * It initializes Express server, middleware, routes, and database connections.
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { DatabasePool } from './database/pool';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { rateLimiter } from './middleware/rate-limiter';
import { securityHeaders, getCSRFTokenHandler } from './utils/security';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import profileRoutes from './routes/profile.routes';
import messagingRoutes from './routes/messaging.routes';
import eventRoutes from './routes/event.routes';
import articleRoutes from './routes/article.routes';
import healthRoutes from './routes/health.routes';
import adminRoutes from './routes/admin.routes';

/**
 * Application class using Singleton pattern
 * Ensures only one instance of the Express app exists
 */
class App {
    private static instance: App;
    public app: Application;
    private db: DatabasePool;

    private constructor() {
        this.app = express();
        this.db = DatabasePool.getInstance();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    /**
     * Get singleton instance of App
     * Thread-safe pattern for Node.js single-threaded environment
     */
    public static getInstance(): App {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    /**
     * Initialize middleware stack
     * Order matters - security middleware first, then parsing, then custom
     */
    private initializeMiddleware(): void {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            },
            crossOriginEmbedderPolicy: false,
        }));

        // Additional security headers
        this.app.use(securityHeaders);

        // CORS configuration
        this.app.use(cors({
            origin: config.corsOrigin,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Hasura-Admin-Secret', 'X-CSRF-Token'],
        }));

        // Rate limiting
        this.app.use(rateLimiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use(requestLogger);

        // Trust proxy for rate limiting behind reverse proxy
        this.app.set('trust proxy', 1);
    }

    /**
     * Initialize API routes
     * Organized by domain for maintainability
     */
    private initializeRoutes(): void {
        // Health check endpoint (no auth required)
        this.app.use('/health', healthRoutes);

        // CSRF token endpoint
        this.app.get('/api/csrf-token', getCSRFTokenHandler);

        // API v1 routes
        const apiRouter = express.Router();
        
        apiRouter.use('/auth', authRoutes);
        apiRouter.use('/users', userRoutes);
        apiRouter.use('/profile', profileRoutes);
        apiRouter.use('/messaging', messagingRoutes);
        apiRouter.use('/events', eventRoutes);
        apiRouter.use('/articles', articleRoutes);
        apiRouter.use('/admin', adminRoutes);

        this.app.use('/api', apiRouter);

        // Root endpoint
        this.app.get('/', (_req: Request, res: Response) => {
            res.json({
                name: 'Abilispace API',
                version: '1.0.0',
                status: 'running',
                documentation: '/api/docs',
            });
        });
    }

    /**
     * Initialize error handling middleware
     * Must be last in middleware chain
     */
    private initializeErrorHandling(): void {
        this.app.use(notFoundHandler);
        this.app.use(errorHandler);
    }

    /**
     * Start the server
     */
    public async start(): Promise<void> {
        try {
            // Test database connection
            await this.db.testConnection();
            logger.info('Database connection established successfully');

            // Start HTTP server
            this.app.listen(config.port, config.host, () => {
                logger.info(`Server running on http://${config.host}:${config.port}`);
                logger.info(`Environment: ${config.nodeEnv}`);
            });
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown handler
     */
    public async shutdown(): Promise<void> {
        logger.info('Shutting down gracefully...');
        await this.db.close();
        logger.info('Database connections closed');
    }
}

// Initialize and start the application
const application = App.getInstance();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    await application.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await application.shutdown();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection:', reason);
    process.exit(1);
});

// Start the server
application.start().catch((error) => {
    logger.error('Application startup failed:', error);
    process.exit(1);
});

export default application.app;
