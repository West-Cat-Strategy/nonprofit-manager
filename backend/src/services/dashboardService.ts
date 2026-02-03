/**
 * Dashboard Service
 * Business logic for dashboard configuration management
 */

import { Pool } from 'pg';
import type {
  DashboardConfig,
  CreateDashboardDTO,
  UpdateDashboardDTO,
} from '../types/dashboard';

export class DashboardService {
  constructor(private pool: Pool) {}

  /**
   * Get all dashboard configurations for a user
   */
  async getUserDashboards(userId: string): Promise<DashboardConfig[]> {
    const result = await this.pool.query(
      `SELECT id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at
       FROM dashboard_configs
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get a specific dashboard configuration
   */
  async getDashboard(id: string, userId: string): Promise<DashboardConfig | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at
       FROM dashboard_configs
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get user's default dashboard
   */
  async getDefaultDashboard(userId: string): Promise<DashboardConfig | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at
       FROM dashboard_configs
       WHERE user_id = $1 AND is_default = true
       LIMIT 1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new dashboard configuration
   */
  async createDashboard(data: CreateDashboardDTO): Promise<DashboardConfig> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // If this is set as default, unset other defaults
      if (data.is_default) {
        await client.query(
          `UPDATE dashboard_configs SET is_default = false WHERE user_id = $1`,
          [data.user_id]
        );
      }

      const result = await client.query(
        `INSERT INTO dashboard_configs (user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at`,
        [
          data.user_id,
          data.name,
          data.is_default,
          JSON.stringify(data.widgets),
          JSON.stringify(data.layout),
          JSON.stringify(data.breakpoints || {}),
          JSON.stringify(data.cols || {}),
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboard(
    id: string,
    userId: string,
    data: UpdateDashboardDTO
  ): Promise<DashboardConfig | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (data.is_default) {
        await client.query(
          `UPDATE dashboard_configs SET is_default = false WHERE user_id = $1 AND id != $2`,
          [userId, id]
        );
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.is_default !== undefined) {
        fields.push(`is_default = $${paramCount++}`);
        values.push(data.is_default);
      }
      if (data.widgets !== undefined) {
        fields.push(`widgets = $${paramCount++}`);
        values.push(JSON.stringify(data.widgets));
      }
      if (data.layout !== undefined) {
        fields.push(`layout = $${paramCount++}`);
        values.push(JSON.stringify(data.layout));
      }
      if (data.breakpoints !== undefined) {
        fields.push(`breakpoints = $${paramCount++}`);
        values.push(JSON.stringify(data.breakpoints || {}));
      }
      if (data.cols !== undefined) {
        fields.push(`cols = $${paramCount++}`);
        values.push(JSON.stringify(data.cols || {}));
      }

      fields.push(`updated_at = NOW()`);

      if (fields.length === 1) {
        // Only updated_at, no actual changes
        const result = await client.query(
          `SELECT id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at
           FROM dashboard_configs
           WHERE id = $1 AND user_id = $2`,
          [id, userId]
        );
        await client.query('COMMIT');
        return result.rows[0] || null;
      }

      values.push(id, userId);

      const result = await client.query(
        `UPDATE dashboard_configs
         SET ${fields.join(', ')}
         WHERE id = $${paramCount++} AND user_id = $${paramCount++}
         RETURNING id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at`,
        values
      );

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update only the layout of a dashboard
   */
  async updateDashboardLayout(
    id: string,
    userId: string,
    layout: any[]
  ): Promise<DashboardConfig | null> {
    const result = await this.pool.query(
      `UPDATE dashboard_configs
       SET layout = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at`,
      [JSON.stringify(layout), id, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Delete dashboard configuration
   */
  async deleteDashboard(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM dashboard_configs WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Create default dashboard for new user
   */
  async createDefaultDashboard(userId: string): Promise<DashboardConfig> {
    const defaultConfig: CreateDashboardDTO = {
      user_id: userId,
      name: 'Default Dashboard',
      is_default: true,
      widgets: [
        {
          id: 'widget-donation-summary',
          type: 'donation_summary',
          title: 'Donation Summary',
          enabled: true,
          layout: { i: 'widget-donation-summary', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        },
        {
          id: 'widget-recent-donations',
          type: 'recent_donations',
          title: 'Recent Donations',
          enabled: true,
          layout: { i: 'widget-recent-donations', x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
        },
        {
          id: 'widget-quick-actions',
          type: 'quick_actions',
          title: 'Quick Actions',
          enabled: true,
          layout: { i: 'widget-quick-actions', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        },
      ],
      layout: [
        { i: 'widget-donation-summary', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'widget-recent-donations', x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'widget-quick-actions', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
      ],
      breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
      cols: { lg: 12, md: 10, sm: 6, xs: 4 },
    };

    // Try to create the default dashboard. If another request creates it concurrently,
    // the partial unique index (user_id where is_default=true) will win and we'll fall back to selecting.
    const insertResult = await this.pool.query(
      `INSERT INTO dashboard_configs (user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at)
       VALUES ($1, $2, true, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (user_id) WHERE is_default = true DO NOTHING
       RETURNING id, user_id, name, is_default, widgets, layout, breakpoints, cols, created_at, updated_at`,
      [
        defaultConfig.user_id,
        defaultConfig.name,
        JSON.stringify(defaultConfig.widgets),
        JSON.stringify(defaultConfig.layout),
        JSON.stringify(defaultConfig.breakpoints || {}),
        JSON.stringify(defaultConfig.cols || {}),
      ]
    );

    if (insertResult.rows[0]) return insertResult.rows[0];

    const existing = await this.getDefaultDashboard(userId);
    if (existing) return existing;

    // If we still don't have one, something is off (e.g. missing index). Fail loudly.
    throw new Error('Failed to create default dashboard');
  }
}
