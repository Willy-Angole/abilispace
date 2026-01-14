"use strict";
/**
 * Environment Configuration
 * Centralized configuration management with validation
 *
 * Uses Zod for runtime type validation ensuring all required
 * environment variables are present and correctly typed.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
/**
 * Environment variable schema
 * Defines all required and optional configuration
 */
const envSchema = zod_1.z.object({
    // Server
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('4000'),
    HOST: zod_1.z.string().default('localhost'),
    // Database
    DATABASE_URL: zod_1.z.string().url(),
    POSTGRES_USER: zod_1.z.string().default('postgres'),
    POSTGRES_PASSWORD: zod_1.z.string(),
    POSTGRES_DB: zod_1.z.string().default('shiriki'),
    POSTGRES_HOST: zod_1.z.string().default('localhost'),
    POSTGRES_PORT: zod_1.z.string().transform(Number).default('5432'),
    // Hasura
    HASURA_GRAPHQL_ENDPOINT: zod_1.z.string().url(),
    HASURA_GRAPHQL_ADMIN_SECRET: zod_1.z.string(),
    // JWT
    JWT_SECRET: zod_1.z.string().min(32),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('30d'),
    // Google OAuth
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    GOOGLE_ALLOWED_CLIENT_IDS: zod_1.z.string().optional(),
    // Frontend Google configuration (used as fallback)
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    // SMTP Email Configuration
    SMTP_HOST: zod_1.z.string().default('smtp.gmail.com'),
    SMTP_PORT: zod_1.z.string().transform(Number).default('587'),
    SMTP_SECURE: zod_1.z.string().transform((val) => val === 'true').default('false'),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASSWORD: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().email().optional(),
    // Password Reset
    PASSWORD_RESET_CODE_EXPIRY_MINUTES: zod_1.z.string().transform(Number).default('15'),
    // Redis (optional for caching)
    REDIS_URL: zod_1.z.string().url().optional(),
    // Security
    BCRYPT_ROUNDS: zod_1.z.string().transform(Number).default('12'),
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().transform(Number).default('100'),
    // CORS
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    // Logging
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
/**
 * Parse and validate environment variables
 * Throws detailed error if validation fails
 */
function validateEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(parsed.error.flatten().fieldErrors);
        throw new Error('Invalid environment configuration');
    }
    return parsed.data;
}
const env = validateEnv();
/**
 * Typed configuration object
 * Provides clean interface for accessing configuration
 */
exports.config = {
    // Server
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    host: env.HOST,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    // Database
    database: {
        url: env.DATABASE_URL,
        user: env.POSTGRES_USER,
        password: env.POSTGRES_PASSWORD,
        name: env.POSTGRES_DB,
        host: env.POSTGRES_HOST,
        port: env.POSTGRES_PORT,
    },
    // Hasura
    hasura: {
        endpoint: env.HASURA_GRAPHQL_ENDPOINT,
        adminSecret: env.HASURA_GRAPHQL_ADMIN_SECRET,
    },
    // JWT
    jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    // Google OAuth
    google: (() => {
        const allowedIds = new Set();
        if (env.GOOGLE_CLIENT_ID) {
            allowedIds.add(env.GOOGLE_CLIENT_ID.trim());
        }
        if (env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
            allowedIds.add(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.trim());
        }
        if (env.GOOGLE_ALLOWED_CLIENT_IDS) {
            env.GOOGLE_ALLOWED_CLIENT_IDS
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id.length > 0)
                .forEach((id) => allowedIds.add(id));
        }
        return {
            clientId: env.GOOGLE_CLIENT_ID || env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            allowedClientIds: Array.from(allowedIds),
        };
    })(),
    // SMTP Email
    smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.SMTP_FROM || 'noreply@abilispace.org',
    },
    // Password Reset
    passwordReset: {
        codeExpiryMinutes: env.PASSWORD_RESET_CODE_EXPIRY_MINUTES,
    },
    // Redis
    redis: {
        url: env.REDIS_URL,
    },
    // Security
    security: {
        bcryptRounds: env.BCRYPT_ROUNDS,
        rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
        rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
    // CORS
    corsOrigin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
    // Logging
    logLevel: env.LOG_LEVEL,
};
//# sourceMappingURL=environment.js.map