/**
 * Alert Service
 * Business logic for alert configuration and evaluation
 */

import { Pool } from 'pg';
import type {
  AlertConfig,
  AlertInstance,
  CreateAlertDTO,
  UpdateAlertDTO,
  AlertTestResult,
} from '@app-types/alert';

export class AlertService {
  constructor(private pool: Pool) {}

  /**
   * Get all alert configurations for a user
   */
  async getUserAlerts(userId: string): Promise<AlertConfig[]> {
    const result = await this.pool.query(
      `SELECT id, user_id, name, description, metric_type, condition, threshold,
              percentage_change, sensitivity, frequency, channels, severity, enabled,
              recipients, filters, created_by, created_at, updated_at, last_triggered
       FROM alert_configs
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get a specific alert configuration
   */
  async getAlert(id: string, userId: string): Promise<AlertConfig | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, name, description, metric_type, condition, threshold,
              percentage_change, sensitivity, frequency, channels, severity, enabled,
              recipients, filters, created_by, created_at, updated_at, last_triggered
       FROM alert_configs
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new alert configuration
   */
  async createAlert(data: CreateAlertDTO): Promise<AlertConfig> {
    const result = await this.pool.query(
      `INSERT INTO alert_configs (
        user_id, name, description, metric_type, condition, threshold,
        percentage_change, sensitivity, frequency, channels, severity, enabled,
        recipients, filters, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING id, user_id, name, description, metric_type, condition, threshold,
                percentage_change, sensitivity, frequency, channels, severity, enabled,
                recipients, filters, created_by, created_at, updated_at, last_triggered`,
      [
        data.user_id,
        data.name,
        data.description || null,
        data.metric_type,
        data.condition,
        data.threshold || null,
        data.percentage_change || null,
        data.sensitivity || 2.0,
        data.frequency,
        JSON.stringify(data.channels),
        data.severity,
        data.enabled,
        JSON.stringify(data.recipients || []),
        JSON.stringify(data.filters || {}),
        data.user_id,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update alert configuration
   */
  async updateAlert(
    id: string,
    userId: string,
    data: UpdateAlertDTO
  ): Promise<AlertConfig | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description || null);
    }
    if (data.metric_type !== undefined) {
      fields.push(`metric_type = $${paramCount++}`);
      values.push(data.metric_type);
    }
    if (data.condition !== undefined) {
      fields.push(`condition = $${paramCount++}`);
      values.push(data.condition);
    }
    if (data.threshold !== undefined) {
      fields.push(`threshold = $${paramCount++}`);
      values.push(data.threshold);
    }
    if (data.percentage_change !== undefined) {
      fields.push(`percentage_change = $${paramCount++}`);
      values.push(data.percentage_change);
    }
    if (data.sensitivity !== undefined) {
      fields.push(`sensitivity = $${paramCount++}`);
      values.push(data.sensitivity);
    }
    if (data.frequency !== undefined) {
      fields.push(`frequency = $${paramCount++}`);
      values.push(data.frequency);
    }
    if (data.channels !== undefined) {
      fields.push(`channels = $${paramCount++}`);
      values.push(JSON.stringify(data.channels));
    }
    if (data.severity !== undefined) {
      fields.push(`severity = $${paramCount++}`);
      values.push(data.severity);
    }
    if (data.enabled !== undefined) {
      fields.push(`enabled = $${paramCount++}`);
      values.push(data.enabled);
    }
    if (data.recipients !== undefined) {
      fields.push(`recipients = $${paramCount++}`);
      values.push(JSON.stringify(data.recipients));
    }
    if (data.filters !== undefined) {
      fields.push(`filters = $${paramCount++}`);
      values.push(JSON.stringify(data.filters));
    }

    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
      // Only updated_at, no actual changes
      return this.getAlert(id, userId);
    }

    values.push(id, userId);

    const result = await this.pool.query(
      `UPDATE alert_configs
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING id, user_id, name, description, metric_type, condition, threshold,
                 percentage_change, sensitivity, frequency, channels, severity, enabled,
                 recipients, filters, created_by, created_at, updated_at, last_triggered`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Delete alert configuration
   */
  async deleteAlert(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM alert_configs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Toggle alert enabled status
   */
  async toggleAlert(id: string, userId: string): Promise<AlertConfig | null> {
    const result = await this.pool.query(
      `UPDATE alert_configs
       SET enabled = NOT enabled, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, name, description, metric_type, condition, threshold,
                 percentage_change, sensitivity, frequency, channels, severity, enabled,
                 recipients, filters, created_by, created_at, updated_at, last_triggered`,
      [id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Test alert configuration without saving
   */
  async testAlert(data: CreateAlertDTO): Promise<AlertTestResult> {
    // Get current metric value based on metric type
    const currentValue = await this.getCurrentMetricValue(
      data.metric_type,
      data.filters || {}
    );

    let wouldTrigger = false;
    let message = '';
    const thresholdValue = data.threshold;

    switch (data.condition) {
      case 'exceeds':
        wouldTrigger = currentValue > (data.threshold || 0);
        message = wouldTrigger
          ? `Current value ${currentValue} exceeds threshold ${data.threshold}`
          : `Current value ${currentValue} is below threshold ${data.threshold}`;
        break;

      case 'drops_below':
        wouldTrigger = currentValue < (data.threshold || 0);
        message = wouldTrigger
          ? `Current value ${currentValue} dropped below threshold ${data.threshold}`
          : `Current value ${currentValue} is above threshold ${data.threshold}`;
        break;

      case 'changes_by':
        // Would need historical data to test percentage change
        message = 'Percentage change requires historical data. Alert configured successfully.';
        break;

      case 'anomaly_detected':
        // Would need statistical analysis
        message = 'Anomaly detection configured with sensitivity ' + (data.sensitivity || 2.0);
        break;

      case 'trend_reversal':
        // Would need trend analysis
        message = 'Trend reversal detection configured successfully.';
        break;
    }

    return {
      would_trigger: wouldTrigger,
      current_value: currentValue,
      threshold_value: thresholdValue,
      message,
      details: {
        metric_type: data.metric_type,
        condition: data.condition,
      },
    };
  }

  /**
   * Get current value for a metric type
   */
  private async getCurrentMetricValue(
    metricType: string,
    _filters: Record<string, any>
  ): Promise<number> {
    let query: string;
    const values: any[] = [];

    switch (metricType) {
      case 'donations':
        query = `SELECT COUNT(*) as value FROM donations WHERE status = 'completed'`;
        break;

      case 'donation_amount':
        query = `SELECT COALESCE(SUM(amount), 0) as value FROM donations WHERE status = 'completed'`;
        break;

      case 'volunteer_hours':
        query = `SELECT COALESCE(SUM(hours), 0) as value FROM volunteer_hours`;
        break;

      case 'event_attendance':
        query = `SELECT COUNT(*) as value FROM event_registrations WHERE status = 'attended'`;
        break;

      case 'case_volume':
        query = `SELECT COUNT(*) as value FROM cases WHERE status IN ('intake', 'active')`;
        break;

      case 'engagement_score':
        // Simplified engagement score calculation
        query = `SELECT COUNT(DISTINCT contact_id) as value FROM (
          SELECT contact_id FROM donations WHERE created_at > NOW() - INTERVAL '30 days'
          UNION
          SELECT contact_id FROM volunteer_hours WHERE date > NOW() - INTERVAL '30 days'
          UNION
          SELECT contact_id FROM event_registrations WHERE created_at > NOW() - INTERVAL '30 days'
        ) engaged_contacts`;
        break;

      default:
        return 0;
    }

    const result = await this.pool.query(query, values);
    return parseFloat(result.rows[0]?.value || '0');
  }

  /**
   * Get alert instances (triggered alerts)
   */
  async getAlertInstances(filters?: {
    status?: string;
    severity?: string;
    limit?: number;
  }): Promise<AlertInstance[]> {
    let query = `
      SELECT id, alert_config_id, alert_name, metric_type, condition, severity,
             status, triggered_at, resolved_at, current_value, threshold_value,
             message, details, acknowledged_by, acknowledged_at
      FROM alert_instances
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      query += ` AND status = $${paramCount++}`;
      values.push(filters.status);
    }

    if (filters?.severity) {
      query += ` AND severity = $${paramCount++}`;
      values.push(filters.severity);
    }

    query += ` ORDER BY triggered_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Acknowledge an alert instance
   */
  async acknowledgeAlert(id: string, userId: string): Promise<AlertInstance | null> {
    const result = await this.pool.query(
      `UPDATE alert_instances
       SET acknowledged_by = $1, acknowledged_at = NOW()
       WHERE id = $2
       RETURNING id, alert_config_id, alert_name, metric_type, condition, severity,
                 status, triggered_at, resolved_at, current_value, threshold_value,
                 message, details, acknowledged_by, acknowledged_at`,
      [userId, id]
    );

    return result.rows[0] || null;
  }

  /**
   * Resolve an alert instance
   */
  async resolveAlert(id: string): Promise<AlertInstance | null> {
    const result = await this.pool.query(
      `UPDATE alert_instances
       SET status = 'resolved', resolved_at = NOW()
       WHERE id = $1
       RETURNING id, alert_config_id, alert_name, metric_type, condition, severity,
                 status, triggered_at, resolved_at, current_value, threshold_value,
                 message, details, acknowledged_by, acknowledged_at`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(userId: string): Promise<any> {
    // Total alerts
    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM alert_configs WHERE user_id = $1`,
      [userId]
    );

    // Active alerts
    const activeResult = await this.pool.query(
      `SELECT COUNT(*) as active FROM alert_configs WHERE user_id = $1 AND enabled = true`,
      [userId]
    );

    // Triggered today
    const todayResult = await this.pool.query(
      `SELECT COUNT(*) as triggered_today
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE`,
      [userId]
    );

    // Triggered this week
    const weekResult = await this.pool.query(
      `SELECT COUNT(*) as triggered_week
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    // Triggered this month
    const monthResult = await this.pool.query(
      `SELECT COUNT(*) as triggered_month
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );

    // By severity
    const severityResult = await this.pool.query(
      `SELECT severity, COUNT(*) as count
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY severity`,
      [userId]
    );

    const bySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    severityResult.rows.forEach((row: any) => {
      bySeverity[row.severity as keyof typeof bySeverity] = parseInt(row.count);
    });

    // By metric
    const metricResult = await this.pool.query(
      `SELECT metric_type, COUNT(*) as count
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY metric_type`,
      [userId]
    );

    const byMetric: Record<string, number> = {};
    metricResult.rows.forEach((row: any) => {
      byMetric[row.metric_type] = parseInt(row.count);
    });

    return {
      total_alerts: parseInt(totalResult.rows[0].total),
      active_alerts: parseInt(activeResult.rows[0].active),
      triggered_today: parseInt(todayResult.rows[0].triggered_today),
      triggered_this_week: parseInt(weekResult.rows[0].triggered_week),
      triggered_this_month: parseInt(monthResult.rows[0].triggered_month),
      by_severity: bySeverity,
      by_metric: byMetric,
    };
  }
}
