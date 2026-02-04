"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const logger_1 = require("./logger");
const constants_1 = require("./constants");
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'nonprofit_manager',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: constants_1.DATABASE.POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: constants_1.DATABASE.IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: constants_1.DATABASE.CONNECTION_TIMEOUT_MS,
    // Avoid Jest hanging on open TCP handles while still allowing real connections during tests.
    // https://node-postgres.com/api/pool
    allowExitOnIdle: process.env.NODE_ENV === 'test',
};
const pool = new pg_1.Pool(config);
// Handle pool errors gracefully without crashing the application
// The application can implement health checks and alerts based on these errors
pool.on('error', (err) => {
    logger_1.logger.error('Unexpected error on idle database client', {
        error: err.message,
        stack: err.stack,
        name: err.name,
    });
    // Don't crash the application - let health checks and monitoring handle it
    // Health check endpoint will detect database connectivity issues
});
exports.default = pool;
//# sourceMappingURL=database.js.map