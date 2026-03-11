import { Pool } from 'pg';
import type {
  AlertConfig,
  AlertInstance,
  AlertInstanceFilters,
  AlertMetricType,
  AlertsRepositoryPort,
  AlertStatsSnapshot,
  CreateAlertDTO,
  UpdateAlertDTO,
} from '../types';

export class AlertsRepository implements AlertsRepositoryPort {
  constructor(private readonly pool: Pool) {}

  async getUserAlerts(userId: string): Promise<AlertConfig[]> {
    const result = await this.pool.query<AlertConfig>(
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

  async getAlert(id: string, userId: string): Promise<AlertConfig | null> {
    const result = await this.pool.query<AlertConfig>(
      `SELECT id, user_id, name, description, metric_type, condition, threshold,
              percentage_change, sensitivity, frequency, channels, severity, enabled,
              recipients, filters, created_by, created_at, updated_at, last_triggered
       FROM alert_configs
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return result.rows[0] || null;
  }

  async createAlert(data: CreateAlertDTO): Promise<AlertConfig> {
    const result = await this.pool.query<AlertConfig>(
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

  async updateAlert(id: string, userId: string, data: UpdateAlertDTO): Promise<AlertConfig | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
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
      return this.getAlert(id, userId);
    }

    values.push(id, userId);

    const result = await this.pool.query<AlertConfig>(
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

  async deleteAlert(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM alert_configs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  async toggleAlert(id: string, userId: string): Promise<AlertConfig | null> {
    const result = await this.pool.query<AlertConfig>(
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

  async getCurrentMetricValue(
    metricType: AlertMetricType,
    _filters: Record<string, unknown>
  ): Promise<number> {
    let query: string;

    switch (metricType) {
      case 'donations':
        query = `SELECT COUNT(*) as value FROM donations WHERE payment_status = 'completed'`;
        break;
      case 'donation_amount':
        query = `SELECT COALESCE(SUM(amount), 0) as value FROM donations WHERE payment_status = 'completed'`;
        break;
      case 'volunteer_hours':
        query = `SELECT COALESCE(SUM(hours_logged), 0) as value FROM volunteer_hours`;
        break;
      case 'event_attendance':
        query = `SELECT COUNT(*) as value
                 FROM event_registrations
                 WHERE checked_in = TRUE OR registration_status = 'attended'`;
        break;
      case 'case_volume':
        query = `SELECT COUNT(*) as value FROM cases WHERE closed_date IS NULL`;
        break;
      case 'engagement_score':
        query = `SELECT COUNT(DISTINCT contact_id) as value FROM (
          SELECT contact_id
          FROM donations
          WHERE contact_id IS NOT NULL
            AND donation_date > NOW() - INTERVAL '30 days'
          UNION
          SELECT v.contact_id
          FROM volunteer_hours vh
          INNER JOIN volunteers v ON v.id = vh.volunteer_id
          WHERE v.contact_id IS NOT NULL
            AND vh.activity_date > CURRENT_DATE - INTERVAL '30 days'
          UNION
          SELECT contact_id
          FROM event_registrations
          WHERE contact_id IS NOT NULL
            AND COALESCE(check_in_time, created_at) > NOW() - INTERVAL '30 days'
        ) engaged_contacts`;
        break;
      default:
        return 0;
    }

    const result = await this.pool.query<{ value: string }>(query);
    return parseFloat(result.rows[0]?.value || '0');
  }

  async getAlertInstances(filters?: AlertInstanceFilters): Promise<AlertInstance[]> {
    let query = `
      SELECT id, alert_config_id, alert_name, metric_type, condition, severity,
             status, triggered_at, resolved_at, current_value, threshold_value,
             message, details, acknowledged_by, acknowledged_at
      FROM alert_instances
      WHERE 1=1
    `;
    const values: unknown[] = [];
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

    const result = await this.pool.query<AlertInstance>(query, values);
    return result.rows;
  }

  async acknowledgeAlert(id: string, userId: string): Promise<AlertInstance | null> {
    const result = await this.pool.query<AlertInstance>(
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

  async resolveAlert(id: string): Promise<AlertInstance | null> {
    const result = await this.pool.query<AlertInstance>(
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

  async getAlertStatsSnapshot(userId: string): Promise<AlertStatsSnapshot> {
    const totalResult = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM alert_configs WHERE user_id = $1`,
      [userId]
    );
    const activeResult = await this.pool.query<{ active: string }>(
      `SELECT COUNT(*) as active FROM alert_configs WHERE user_id = $1 AND enabled = true`,
      [userId]
    );
    const todayResult = await this.pool.query<{ triggered_today: string }>(
      `SELECT COUNT(*) as triggered_today
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE`,
      [userId]
    );
    const weekResult = await this.pool.query<{ triggered_week: string }>(
      `SELECT COUNT(*) as triggered_week
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );
    const monthResult = await this.pool.query<{ triggered_month: string }>(
      `SELECT COUNT(*) as triggered_month
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );
    const severityResult = await this.pool.query<{ severity: AlertConfig['severity']; count: string }>(
      `SELECT severity, COUNT(*) as count
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY severity`,
      [userId]
    );
    const metricResult = await this.pool.query<{ metric_type: AlertMetricType; count: string }>(
      `SELECT metric_type, COUNT(*) as count
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1 AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY metric_type`,
      [userId]
    );

    return {
      total: totalResult.rows[0]?.total || '0',
      active: activeResult.rows[0]?.active || '0',
      triggered_today: todayResult.rows[0]?.triggered_today || '0',
      triggered_week: weekResult.rows[0]?.triggered_week || '0',
      triggered_month: monthResult.rows[0]?.triggered_month || '0',
      severity_rows: severityResult.rows,
      metric_rows: metricResult.rows,
    };
  }
}
