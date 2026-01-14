/**
 * Environment Configuration
 * Centralized configuration management with validation
 *
 * Uses Zod for runtime type validation ensuring all required
 * environment variables are present and correctly typed.
 */
/**
 * Typed configuration object
 * Provides clean interface for accessing configuration
 */
export declare const config: {
    readonly nodeEnv: "development" | "production" | "test";
    readonly port: number;
    readonly host: string;
    readonly isDevelopment: boolean;
    readonly isProduction: boolean;
    readonly isTest: boolean;
    readonly database: {
        readonly url: string;
        readonly user: string;
        readonly password: string;
        readonly name: string;
        readonly host: string;
        readonly port: number;
    };
    readonly hasura: {
        readonly endpoint: string;
        readonly adminSecret: string;
    };
    readonly jwt: {
        readonly secret: string;
        readonly expiresIn: string;
        readonly refreshExpiresIn: string;
    };
    readonly google: {
        readonly clientId: string | undefined;
        readonly clientSecret: string | undefined;
        readonly allowedClientIds: string[];
    };
    readonly smtp: {
        readonly host: string;
        readonly port: number;
        readonly secure: boolean;
        readonly user: string | undefined;
        readonly password: string | undefined;
        readonly from: string;
    };
    readonly passwordReset: {
        readonly codeExpiryMinutes: number;
    };
    readonly redis: {
        readonly url: string | undefined;
    };
    readonly security: {
        readonly bcryptRounds: number;
        readonly rateLimitWindowMs: number;
        readonly rateLimitMaxRequests: number;
    };
    readonly corsOrigin: string[];
    readonly logLevel: "error" | "warn" | "info" | "debug";
};
export type Config = typeof config;
//# sourceMappingURL=environment.d.ts.map