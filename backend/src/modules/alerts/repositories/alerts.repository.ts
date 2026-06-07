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

  async getUserAlerts(userId: string, organizationId: string): Promise<AlertConfig[]> {
    const result = await this.pool.query<AlertConfig>(
      `SELECT id, user_id, organization_id, name, description, metric_type, condition, threshold,
              percentage_change, sensitivity, frequency, channels, severity, enabled,
              recipients, filters, created_by, created_at, updated_at, last_triggered
       FROM alert_configs
       WHERE user_id = $1 AND organization_id = $2
       ORDER BY created_at DESC`,
      [userId, organizationId]
    );

    return result.rows;
  }

  async getAlert(id: string, userId: string, organizationId: string): Promise<AlertConfig | null> {
    const result = await this.pool.query<AlertConfig>(
      `SELECT id, user_id, organization_id, name, description, metric_type, condition, threshold,
              percentage_change, sensitivity, frequency, channels, severity, enabled,
              recipients, filters, created_by, created_at, updated_at, last_triggered
       FROM alert_configs
       WHERE id = $1 AND user_id = $2 AND organization_id = $3`,
      [id, userId, organizationId]
    );

    return result.rows[0] || null;
  }

  async createAlert(data: CreateAlertDTO): Promise<AlertConfig> {
    const result = await this.pool.query<AlertConfig>(
      `INSERT INTO alert_configs (
        user_id, organization_id, name, description, metric_type, condition, threshold,
        percentage_change, sensitivity, frequency, channels, severity, enabled,
        recipients, filters, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING id, user_id, organization_id, name, description, metric_type, condition, threshold,
                percentage_change, sensitivity, frequency, channels, severity, enabled,
                recipients, filters, created_by, created_at, updated_at, last_triggered`,
      [
        data.user_id,
        data.organization_id,
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

  async updateAlert(
    id: string,
    userId: string,
    organizationId: string,
    data: UpdateAlertDTO
  ): Promise<AlertConfig | null> {
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
      return this.getAlert(id, userId, organizationId);
    }

    values.push(id, userId, organizationId);

    const result = await this.pool.query<AlertConfig>(
      `UPDATE alert_configs
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
         AND user_id = $${paramCount + 1}
         AND organization_id = $${paramCount + 2}
       RETURNING id, user_id, organization_id, name, description, metric_type, condition, threshold,
                 percentage_change, sensitivity, frequency, channels, severity, enabled,
                 recipients, filters, created_by, created_at, updated_at, last_triggered`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteAlert(id: string, userId: string, organizationId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM alert_configs WHERE id = $1 AND user_id = $2 AND organization_id = $3`,
      [id, userId, organizationId]
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  async toggleAlert(id: string, userId: string, organizationId: string): Promise<AlertConfig | null> {
    const result = await this.pool.query<AlertConfig>(
      `UPDATE alert_configs
       SET enabled = NOT enabled, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND organization_id = $3
       RETURNING id, user_id, organization_id, name, description, metric_type, condition, threshold,
                 percentage_change, sensitivity, frequency, channels, severity, enabled,
                 recipients, filters, created_by, created_at, updated_at, last_triggered`,
      [id, userId, organizationId]
    );

    return result.rows[0] || null;
  }

  async getCurrentMetricValue(
    metricType: AlertMetricType,
    _filters: Record<string, unknown>,
    organizationId: string
  ): Promise<number> {
    let query: string;
    const values = [organizationId];

    switch (metricType) {
      case 'donations':
        query = `SELECT COUNT(*) as value
                 FROM donations d
                 LEFT JOIN contacts c ON c.id = d.contact_id
                 WHERE d.payment_status = 'completed'
                   AND COALESCE(d.account_id, c.account_id) = $1`;
        break;
      case 'donation_amount':
        query = `SELECT COALESCE(SUM(d.amount), 0) as value
                 FROM donations d
                 LEFT JOIN contacts c ON c.id = d.contact_id
                 WHERE d.payment_status = 'completed'
                   AND COALESCE(d.account_id, c.account_id) = $1`;
        break;
      case 'volunteer_hours':
        query = `SELECT COALESCE(SUM(vh.hours_logged), 0) as value
                 FROM volunteer_hours vh
                 INNER JOIN volunteers v ON v.id = vh.volunteer_id
                 INNER JOIN contacts c ON c.id = v.contact_id
                 WHERE c.account_id = $1`;
        break;
      case 'event_attendance':
        query = `SELECT COUNT(*) as value
                 FROM event_registrations er
                 LEFT JOIN events e ON e.id = er.event_id
                 LEFT JOIN event_occurrences eo ON eo.id = er.occurrence_id
                 WHERE (er.checked_in = TRUE OR er.registration_status = 'attended')
                   AND COALESCE(e.organization_id, eo.organization_id) = $1`;
        break;
      case 'case_volume':
        query = `SELECT COUNT(*) as value
                 FROM cases
                 WHERE closed_date IS NULL
                   AND account_id = $1`;
        break;
      case 'engagement_score':
        query = `SELECT COUNT(DISTINCT contact_id) as value FROM (
          SELECT d.contact_id
          FROM donations d
          LEFT JOIN contacts c ON c.id = d.contact_id
          WHERE d.contact_id IS NOT NULL
            AND d.donation_date > NOW() - INTERVAL '30 days'
            AND COALESCE(d.account_id, c.account_id) = $1
          UNION
          SELECT v.contact_id
          FROM volunteer_hours vh
          INNER JOIN volunteers v ON v.id = vh.volunteer_id
          INNER JOIN contacts vc ON vc.id = v.contact_id
          WHERE v.contact_id IS NOT NULL
            AND vh.activity_date > CURRENT_DATE - INTERVAL '30 days'
            AND vc.account_id = $1
          UNION
          SELECT er.contact_id
          FROM event_registrations er
          LEFT JOIN events e ON e.id = er.event_id
          LEFT JOIN event_occurrences eo ON eo.id = er.occurrence_id
          WHERE er.contact_id IS NOT NULL
            AND COALESCE(er.check_in_time, er.created_at) > NOW() - INTERVAL '30 days'
            AND COALESCE(e.organization_id, eo.organization_id) = $1
        ) engaged_contacts`;
        break;
      default:
        return 0;
    }

    const result = await this.pool.query<{ value: string }>(query, values);
    return parseFloat(result.rows[0]?.value || '0');
  }

  async getAlertInstances(filters: AlertInstanceFilters): Promise<AlertInstance[]> {
    let query = `
      SELECT ai.id, ai.alert_config_id, ai.alert_name, ai.metric_type, ai.condition, ai.severity,
             ai.status, ai.triggered_at, ai.resolved_at, ai.current_value, ai.threshold_value,
             ai.message, ai.details, ai.acknowledged_by, ai.acknowledged_at
      FROM alert_instances ai
      JOIN alert_configs ac ON ai.alert_config_id = ac.id
      WHERE ac.user_id = $1
        AND ac.organization_id = $2
    `;
    const values: unknown[] = [filters.userId, filters.organizationId];
    let paramCount = 3;

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

  async acknowledgeAlert(
    id: string,
    userId: string,
    organizationId: string
  ): Promise<AlertInstance | null> {
    const result = await this.pool.query<AlertInstance>(
      `UPDATE alert_instances ai
       SET acknowledged_by = $1, acknowledged_at = NOW()
       FROM alert_configs ac
       WHERE ai.id = $2
         AND ai.alert_config_id = ac.id
         AND ac.user_id = $1
         AND ac.organization_id = $3
       RETURNING ai.id, ai.alert_config_id, ai.alert_name, ai.metric_type, ai.condition, ai.severity,
                 ai.status, ai.triggered_at, ai.resolved_at, ai.current_value, ai.threshold_value,
                 ai.message, ai.details, ai.acknowledged_by, ai.acknowledged_at`,
      [userId, id, organizationId]
    );

    return result.rows[0] || null;
  }

  async resolveAlert(
    id: string,
    userId: string,
    organizationId: string
  ): Promise<AlertInstance | null> {
    const result = await this.pool.query<AlertInstance>(
      `UPDATE alert_instances ai
       SET status = 'resolved', resolved_at = NOW()
       FROM alert_configs ac
       WHERE ai.id = $1
         AND ai.alert_config_id = ac.id
         AND ac.user_id = $2
         AND ac.organization_id = $3
       RETURNING ai.id, ai.alert_config_id, ai.alert_name, ai.metric_type, ai.condition, ai.severity,
                 ai.status, ai.triggered_at, ai.resolved_at, ai.current_value, ai.threshold_value,
                 ai.message, ai.details, ai.acknowledged_by, ai.acknowledged_at`,
      [id, userId, organizationId]
    );

    return result.rows[0] || null;
  }

  async getAlertStatsSnapshot(userId: string, organizationId: string): Promise<AlertStatsSnapshot> {
    const totalResult = await this.pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM alert_configs WHERE user_id = $1 AND organization_id = $2`,
      [userId, organizationId]
    );
    const activeResult = await this.pool.query<{ active: string }>(
      `SELECT COUNT(*) as active
       FROM alert_configs
       WHERE user_id = $1 AND organization_id = $2 AND enabled = true`,
      [userId, organizationId]
    );
    const todayResult = await this.pool.query<{ triggered_today: string }>(
      `SELECT COUNT(*) as triggered_today
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1
         AND ac.organization_id = $2
         AND ai.triggered_at >= CURRENT_DATE`,
      [userId, organizationId]
    );
    const weekResult = await this.pool.query<{ triggered_week: string }>(
      `SELECT COUNT(*) as triggered_week
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1
         AND ac.organization_id = $2
         AND ai.triggered_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId, organizationId]
    );
    const monthResult = await this.pool.query<{ triggered_month: string }>(
      `SELECT COUNT(*) as triggered_month
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1
         AND ac.organization_id = $2
         AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId, organizationId]
    );
    const severityResult = await this.pool.query<{ severity: AlertConfig['severity']; count: string }>(
      `SELECT ai.severity AS severity, COUNT(*) as count
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1
         AND ac.organization_id = $2
         AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY ai.severity`,
      [userId, organizationId]
    );
    const metricResult = await this.pool.query<{ metric_type: AlertMetricType; count: string }>(
      `SELECT ai.metric_type AS metric_type, COUNT(*) as count
       FROM alert_instances ai
       JOIN alert_configs ac ON ai.alert_config_id = ac.id
       WHERE ac.user_id = $1
         AND ac.organization_id = $2
         AND ai.triggered_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY ai.metric_type`,
      [userId, organizationId]
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
