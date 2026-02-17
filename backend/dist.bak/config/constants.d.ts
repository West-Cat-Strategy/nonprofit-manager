/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers and strings
 */
/**
 * Rate Limiting Configuration
 */
export declare const RATE_LIMIT: {
    readonly WINDOW_MS: number;
    readonly MAX_REQUESTS: 100;
    readonly AUTH_WINDOW_MS: number;
    readonly AUTH_MAX_ATTEMPTS: 5;
    readonly PASSWORD_RESET_WINDOW_MS: number;
    readonly PASSWORD_RESET_MAX_ATTEMPTS: 3;
    readonly REGISTRATION_WINDOW_MS: number;
    readonly REGISTRATION_MAX_ATTEMPTS: 5;
};
/**
 * JWT Token Configuration
 */
export declare const JWT: {
    readonly ACCESS_TOKEN_EXPIRY: "24h";
    readonly REFRESH_TOKEN_EXPIRY: "7d";
};
/**
 * Pagination Configuration
 */
export declare const PAGINATION: {
    readonly DEFAULT_LIMIT: 20;
    readonly MIN_LIMIT: 1;
    readonly MAX_LIMIT: 100;
    readonly ACTIVITY_DEFAULT_LIMIT: 10;
    readonly ACTIVITY_MAX_LIMIT: 50;
    readonly WEBHOOK_DEFAULT_LIMIT: 50;
    readonly WEBHOOK_DELIVERY_DEFAULT_LIMIT: 100;
};
/**
 * Cache Configuration (in seconds)
 */
export declare const CACHE: {
    readonly DEFAULT_TTL: 300;
    readonly ANALYTICS_TTL: 300;
    readonly DASHBOARD_TTL: 60;
    readonly CLEANUP_INTERVAL_MS: number;
    readonly MAX_ENTRIES: 10000;
};
/**
 * Database Connection Pool Configuration
 */
export declare const DATABASE: {
    readonly POOL_MAX_CONNECTIONS: 20;
    readonly IDLE_TIMEOUT_MS: number;
    readonly CONNECTION_TIMEOUT_MS: 2000;
};
/**
 * Password Hashing Configuration
 */
export declare const PASSWORD: {
    readonly BCRYPT_SALT_ROUNDS: 10;
    readonly MIN_LENGTH: 8;
    readonly MAX_LENGTH: 128;
};
/**
 * HTTP Status Codes
 * Commonly used status codes for consistency
 */
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
};
/**
 * Time Constants (in milliseconds)
 */
export declare const TIME: {
    readonly ONE_SECOND: 1000;
    readonly ONE_MINUTE: number;
    readonly FIVE_MINUTES: number;
    readonly FIFTEEN_MINUTES: number;
    readonly ONE_HOUR: number;
    readonly ONE_DAY: number;
    readonly ONE_WEEK: number;
};
/**
 * Environment Constants
 */
export declare const ENVIRONMENT: {
    readonly DEVELOPMENT: "development";
    readonly PRODUCTION: "production";
    readonly TEST: "test";
};
/**
 * Error Messages
 */
export declare const ERROR_MESSAGES: {
    readonly INVALID_CREDENTIALS: "Invalid credentials";
    readonly USER_ALREADY_EXISTS: "User already exists";
    readonly USER_NOT_FOUND: "User not found";
    readonly UNAUTHORIZED: "Unauthorized access";
    readonly TOKEN_EXPIRED: "Token has expired";
    readonly TOO_MANY_REQUESTS: "Too many requests from this IP, please try again later.";
    readonly TOO_MANY_LOGIN_ATTEMPTS: "Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.";
    readonly TOO_MANY_PASSWORD_RESETS: "Too many password reset requests. Please wait before requesting another password reset.";
    readonly TOO_MANY_REGISTRATIONS: "Too many accounts created from this IP address. Please try again later.";
    readonly INVALID_INPUT: "Invalid input data";
    readonly MISSING_REQUIRED_FIELD: "Missing required field";
    readonly INVALID_ENTITY_TYPE: "Invalid entity type";
    readonly INVALID_PAGINATION: "Limit must be between 1 and 50";
    readonly DATABASE_ERROR: "Database error occurred";
    readonly QUERY_FAILED: "Query execution failed";
    readonly INTERNAL_ERROR: "Internal server error";
    readonly NOT_FOUND: "Resource not found";
};
//# sourceMappingURL=constants.d.ts.map