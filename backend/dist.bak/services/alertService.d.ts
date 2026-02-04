/**
 * Alert Service
 * Business logic for alert configuration and evaluation
 */
import { Pool } from 'pg';
import type { AlertConfig, AlertInstance, CreateAlertDTO, UpdateAlertDTO, AlertTestResult } from '../types/alert';
export declare class AlertService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get all alert configurations for a user
     */
    getUserAlerts(userId: string): Promise<AlertConfig[]>;
    /**
     * Get a specific alert configuration
     */
    getAlert(id: string, userId: string): Promise<AlertConfig | null>;
    /**
     * Create a new alert configuration
     */
    createAlert(data: CreateAlertDTO): Promise<AlertConfig>;
    /**
     * Update alert configuration
     */
    updateAlert(id: string, userId: string, data: UpdateAlertDTO): Promise<AlertConfig | null>;
    /**
     * Delete alert configuration
     */
    deleteAlert(id: string, userId: string): Promise<boolean>;
    /**
     * Toggle alert enabled status
     */
    toggleAlert(id: string, userId: string): Promise<AlertConfig | null>;
    /**
     * Test alert configuration without saving
     */
    testAlert(data: CreateAlertDTO): Promise<AlertTestResult>;
    /**
     * Get current value for a metric type
     */
    private getCurrentMetricValue;
    /**
     * Get alert instances (triggered alerts)
     */
    getAlertInstances(filters?: {
        status?: string;
        severity?: string;
        limit?: number;
    }): Promise<AlertInstance[]>;
    /**
     * Acknowledge an alert instance
     */
    acknowledgeAlert(id: string, userId: string): Promise<AlertInstance | null>;
    /**
     * Resolve an alert instance
     */
    resolveAlert(id: string): Promise<AlertInstance | null>;
    /**
     * Get alert statistics
     */
    getAlertStats(userId: string): Promise<any>;
}
//# sourceMappingURL=alertService.d.ts.map