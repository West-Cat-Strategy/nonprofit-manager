/**
 * Task Analytics Service
 * Handles task-related metrics
 */
import { Pool } from 'pg';
import type { TaskMetrics } from '../../types/analytics';
export declare class TaskAnalyticsService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get task metrics for an account or contact
     */
    getTaskMetrics(entityType: 'account' | 'contact', entityId: string): Promise<TaskMetrics>;
}
//# sourceMappingURL=taskAnalytics.d.ts.map