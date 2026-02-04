/**
 * Activity Service
 * Fetches and aggregates activities across the application
 */
import type { Activity } from '../types/activity';
export declare class ActivityService {
    /**
     * Get recent activities across all modules
     */
    getRecentActivities(limit?: number): Promise<Activity[]>;
    /**
     * Get activities for a specific entity
     */
    getActivitiesForEntity(_entityType: 'case' | 'donation' | 'volunteer' | 'event' | 'contact', _entityId: string): Promise<Activity[]>;
}
declare const _default: ActivityService;
export default _default;
//# sourceMappingURL=activityService.d.ts.map