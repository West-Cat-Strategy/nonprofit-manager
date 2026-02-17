/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers and strings
 */

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT = {
  // General API rate limiting
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes in milliseconds
  MAX_REQUESTS: 100, // Maximum requests per window

  // Authentication rate limiting
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes in milliseconds
  AUTH_MAX_ATTEMPTS: 5, // Maximum login attempts per window

  // Password reset rate limiting
  PASSWORD_RESET_WINDOW_MS: 60 * 60 * 1000, // 1 hour in milliseconds
  PASSWORD_RESET_MAX_ATTEMPTS: 3, // Maximum password reset requests per hour

  // Registration rate limiting
  REGISTRATION_WINDOW_MS: 60 * 60 * 1000, // 1 hour in milliseconds
  REGISTRATION_MAX_ATTEMPTS: 5, // Maximum registrations per IP per hour
} as const;

/**
 * JWT Token Configuration
 */
export const JWT = {
  ACCESS_TOKEN_EXPIRY: '24h', // Access token expiration time
  REFRESH_TOKEN_EXPIRY: '7d', // Refresh token expiration time (if used)
} as const;

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20, // Default number of items per page
  MIN_LIMIT: 1, // Minimum items per page
  MAX_LIMIT: 100, // Maximum items per page
  ACTIVITY_DEFAULT_LIMIT: 10, // Default limit for activity feeds
  ACTIVITY_MAX_LIMIT: 50, // Maximum limit for activity feeds
  WEBHOOK_DEFAULT_LIMIT: 50, // Default limit for webhook lists
  WEBHOOK_DELIVERY_DEFAULT_LIMIT: 100, // Default limit for webhook deliveries
} as const;

/**
 * Cache Configuration (in seconds)
 */
export const CACHE = {
  DEFAULT_TTL: 300, // 5 minutes - default cache TTL
  ANALYTICS_TTL: 300, // 5 minutes - analytics cache TTL
  DASHBOARD_TTL: 60, // 1 minute - dashboard cache TTL (more frequent updates)
  CLEANUP_INTERVAL_MS: 60 * 1000, // 1 minute - cache cleanup interval
  MAX_ENTRIES: 10000, // Maximum cache entries before LRU eviction
} as const;

/**
 * Database Connection Pool Configuration
 */
export const DATABASE = {
  POOL_MAX_CONNECTIONS: 20, // Maximum number of connections in pool
  IDLE_TIMEOUT_MS: 30 * 1000, // 30 seconds - idle connection timeout
  CONNECTION_TIMEOUT_MS: 2000, // 2 seconds - connection timeout
} as const;

/**
 * Password Hashing Configuration
 */
export const PASSWORD = {
  BCRYPT_SALT_ROUNDS: 10, // Number of bcrypt salt rounds
  MIN_LENGTH: 8, // Minimum password length
  MAX_LENGTH: 128, // Maximum password length
} as const;

/**
 * HTTP Status Codes
 * Commonly used status codes for consistency
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Time Constants (in milliseconds)
 */
export const TIME = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Environment Constants
 */
export const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_ALREADY_EXISTS: 'User already exists',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',
  TOKEN_EXPIRED: 'Token has expired',

  // Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests from this IP, please try again later.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
  TOO_MANY_PASSWORD_RESETS: 'Too many password reset requests. Please wait before requesting another password reset.',
  TOO_MANY_REGISTRATIONS: 'Too many accounts created from this IP address. Please try again later.',

  // Validation
  INVALID_INPUT: 'Invalid input data',
  MISSING_REQUIRED_FIELD: 'Missing required field',
  INVALID_ENTITY_TYPE: 'Invalid entity type',
  INVALID_PAGINATION: 'Limit must be between 1 and 50',

  // Database
  DATABASE_ERROR: 'Database error occurred',
  QUERY_FAILED: 'Query execution failed',

  // General
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
} as const;
