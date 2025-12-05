"use strict";
/**
 * Shiriki Backend - Application Entry Point
 *
 * This is the main entry point for the Shiriki backend service.
 * It initializes Express server, middleware, routes, and database connections.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const environment_1 = require("./config/environment");
const logger_1 = require("./utils/logger");
const pool_1 = require("./database/pool");
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
const rate_limiter_1 = require("./middleware/rate-limiter");
const security_1 = require("./utils/security");
// Route imports
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const messaging_routes_1 = __importDefault(require("./routes/messaging.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const article_routes_1 = __importDefault(require("./routes/article.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
/**
 * Application class using Singleton pattern
 * Ensures only one instance of the Express app exists
 */
class App {
    static instance;
    app;
    db;
    constructor() {
        this.app = (0, express_1.default)();
        this.db = pool_1.DatabasePool.getInstance();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    /**
     * Get singleton instance of App
     * Thread-safe pattern for Node.js single-threaded environment
     */
    static getInstance() {
        if (!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }
    /**
     * Initialize middleware stack
     * Order matters - security middleware first, then parsing, then custom
     */
    initializeMiddleware() {
        // Security middleware
        this.app.use((0, helmet_1.default)({
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
        this.app.use(security_1.securityHeaders);
        // CORS configuration
        this.app.use((0, cors_1.default)({
            origin: environment_1.config.corsOrigin,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Hasura-Admin-Secret', 'X-CSRF-Token'],
        }));
        // Rate limiting
        this.app.use(rate_limiter_1.rateLimiter);
        // Body parsing middleware
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        // Request logging
        this.app.use(request_logger_1.requestLogger);
        // Trust proxy for rate limiting behind reverse proxy
        this.app.set('trust proxy', 1);
    }
    /**
     * Initialize API routes
     * Organized by domain for maintainability
     */
    initializeRoutes() {
        // Health check endpoint (no auth required)
        this.app.use('/health', health_routes_1.default);
        // CSRF token endpoint
        this.app.get('/api/csrf-token', security_1.getCSRFTokenHandler);
        // API v1 routes
        const apiRouter = express_1.default.Router();
        apiRouter.use('/auth', auth_routes_1.default);
        apiRouter.use('/users', user_routes_1.default);
        apiRouter.use('/profile', profile_routes_1.default);
        apiRouter.use('/messaging', messaging_routes_1.default);
        apiRouter.use('/events', event_routes_1.default);
        apiRouter.use('/articles', article_routes_1.default);
        apiRouter.use('/admin', admin_routes_1.default);
        this.app.use('/api', apiRouter);
        // Root endpoint
        this.app.get('/', (_req, res) => {
            res.json({
                name: 'Shiriki API',
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
    initializeErrorHandling() {
        this.app.use(error_handler_1.notFoundHandler);
        this.app.use(error_handler_1.errorHandler);
    }
    /**
     * Start the server
     */
    async start() {
        try {
            // Test database connection
            await this.db.testConnection();
            logger_1.logger.info('Database connection established successfully');
            // Start HTTP server
            this.app.listen(environment_1.config.port, environment_1.config.host, () => {
                logger_1.logger.info(`Server running on http://${environment_1.config.host}:${environment_1.config.port}`);
                logger_1.logger.info(`Environment: ${environment_1.config.nodeEnv}`);
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    /**
     * Graceful shutdown handler
     */
    async shutdown() {
        logger_1.logger.info('Shutting down gracefully...');
        await this.db.close();
        logger_1.logger.info('Database connections closed');
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
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection:', reason);
    process.exit(1);
});
// Start the server
application.start().catch((error) => {
    logger_1.logger.error('Application startup failed:', error);
    process.exit(1);
});
exports.default = application.app;
//# sourceMappingURL=index.js.map