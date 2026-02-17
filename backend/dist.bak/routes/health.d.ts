/**
 * Health Check Routes
 * Provides liveness and readiness endpoints for container orchestration
 */
import { Pool } from 'pg';
declare const router: import("express-serve-static-core").Router;
export declare const setHealthCheckPool: (dbPool: Pool) => void;
export default router;
//# sourceMappingURL=health.d.ts.map