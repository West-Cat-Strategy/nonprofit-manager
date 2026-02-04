/**
 * Dashboard Service
 * Business logic for dashboard configuration management
 */
import { Pool } from 'pg';
import type { DashboardConfig, CreateDashboardDTO, UpdateDashboardDTO } from '../types/dashboard';
export declare class DashboardService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get all dashboard configurations for a user
     */
    getUserDashboards(userId: string): Promise<DashboardConfig[]>;
    /**
     * Get a specific dashboard configuration
     */
    getDashboard(id: string, userId: string): Promise<DashboardConfig | null>;
    /**
     * Get user's default dashboard
     */
    getDefaultDashboard(userId: string): Promise<DashboardConfig | null>;
    /**
     * Create a new dashboard configuration
     */
    createDashboard(data: CreateDashboardDTO): Promise<DashboardConfig>;
    /**
     * Update dashboard configuration
     */
    updateDashboard(id: string, userId: string, data: UpdateDashboardDTO): Promise<DashboardConfig | null>;
    /**
     * Update only the layout of a dashboard
     */
    updateDashboardLayout(id: string, userId: string, layout: any[]): Promise<DashboardConfig | null>;
    /**
     * Delete dashboard configuration
     */
    deleteDashboard(id: string, userId: string): Promise<boolean>;
    /**
     * Create default dashboard for new user
     */
    createDefaultDashboard(userId: string): Promise<DashboardConfig>;
}
//# sourceMappingURL=dashboardService.d.ts.map