/**
 * Saved Report Service
 * Handles CRUD operations for saved reports
 */

import { Pool } from 'pg';
import { logger } from '@config/logger';
import type {
  SavedReport,
  CreateSavedReportRequest,
  UpdateSavedReportRequest,
} from '@app-types/savedReport';

export class SavedReportService {
  constructor(private pool: Pool) { }

  /**
   * Get all saved reports (optionally filter by user or entity)
   */
  async getSavedReports(userId?: string, entity?: string): Promise<SavedReport[]> {
    try {
      let query = `
        SELECT * FROM saved_reports
        WHERE (is_public = TRUE OR created_by = $1)
      `;
      const params: (string | undefined)[] = [userId];

      if (entity) {
        query += ` AND entity = $2`;
        params.push(entity);
      }

      query += ` ORDER BY updated_at DESC`;

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching saved reports', { error, userId, entity });
      throw new Error('Failed to fetch saved reports');
    }
  }

  /**
   * Get a single saved report by ID
   */
  async getSavedReportById(id: string, userId?: string): Promise<SavedReport | null> {
    try {
      const query = `
        SELECT * FROM saved_reports
        WHERE id = $1 AND (is_public = TRUE OR created_by = $2)
      `;
      const result = await this.pool.query(query, [id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching saved report by ID', { error, id, userId });
      throw new Error('Failed to fetch saved report');
    }
  }

  /**
   * Create a new saved report
   */
  async createSavedReport(
    userId: string,
    data: CreateSavedReportRequest
  ): Promise<SavedReport> {
    try {
      const query = `
        INSERT INTO saved_reports (name, description, entity, report_definition, created_by, is_public)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [
        data.name,
        data.description || null,
        data.entity,
        JSON.stringify(data.report_definition),
        userId,
        data.is_public || false,
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating saved report', { error, userId, data });
      throw new Error('Failed to create saved report');
    }
  }

  /**
   * Update an existing saved report
   */
  async updateSavedReport(
    id: string,
    userId: string,
    data: UpdateSavedReportRequest
  ): Promise<SavedReport | null> {
    try {
      // First check if report exists and user owns it
      const checkQuery = `
        SELECT * FROM saved_reports
        WHERE id = $1 AND created_by = $2
      `;
      const checkResult = await this.pool.query(checkQuery, [id, userId]);

      if (checkResult.rows.length === 0) {
        return null;
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }

      if (data.report_definition !== undefined) {
        updates.push(`report_definition = $${paramIndex}`);
        values.push(JSON.stringify(data.report_definition));
        paramIndex++;
      }

      if (data.is_public !== undefined) {
        updates.push(`is_public = $${paramIndex}`);
        values.push(data.is_public);
        paramIndex++;
      }

      if (updates.length === 0) {
        return checkResult.rows[0];
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, userId);

      const query = `
        UPDATE saved_reports
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND created_by = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating saved report', { error, id, userId, data });
      throw new Error('Failed to update saved report');
    }
  }

  /**
   * Delete a saved report
   */
  async deleteSavedReport(id: string, userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM saved_reports
        WHERE id = $1 AND created_by = $2
        RETURNING id
      `;
      const result = await this.pool.query(query, [id, userId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error deleting saved report', { error, id, userId });
      throw new Error('Failed to delete saved report');
    }
  }

  /**
   * Share report with users or roles
   */
  async shareReport(
    reportId: string,
    userIds?: string[],
    roleNames?: string[],
    shareSettings?: { can_edit: boolean; expires_at?: string }
  ): Promise<SavedReport> {
    try {
      const query = `
        UPDATE saved_reports
        SET 
          shared_with_users = COALESCE(shared_with_users, '{}') || $2::uuid[],
          shared_with_roles = COALESCE(shared_with_roles, '{}') || $3::text[],
          share_settings = $4,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        reportId,
        userIds || [],
        roleNames || [],
        JSON.stringify(shareSettings || { can_edit: false }),
      ]);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error sharing report', { error, reportId });
      throw new Error('Failed to share report');
    }
  }

  /**
   * Remove share access for specific users or roles
   */
  async removeShare(
    reportId: string,
    userIds?: string[],
    roleNames?: string[]
  ): Promise<SavedReport> {
    try {
      let query = 'UPDATE saved_reports SET ';
      const setClauses: string[] = [];
      const params: any[] = [reportId];
      let paramIndex = 2;

      if (userIds && userIds.length > 0) {
        setClauses.push(`shared_with_users = array_remove_all(shared_with_users, $${paramIndex}::uuid[])`);
        params.push(userIds);
        paramIndex++;
      }

      if (roleNames && roleNames.length > 0) {
        setClauses.push(`shared_with_roles = array_remove_all(shared_with_roles, $${paramIndex}::text[])`);
        params.push(roleNames);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        throw new Error('No users or roles specified to remove');
      }

      query += setClauses.join(', ');
      query += ', updated_at = NOW() WHERE id = $1 RETURNING *';

      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error removing share', { error, reportId });
      throw new Error('Failed to remove share');
    }
  }

  /**
   * Generate a public shareable link
   */
  async generatePublicLink(reportId: string, expiresAt?: string): Promise<string> {
    try {
      // Generate a random token
      const token = this.generateToken();

      const query = `
        UPDATE saved_reports
        SET 
          public_token = $2,
          share_settings = jsonb_set(
            COALESCE(share_settings, '{}'::jsonb),
            '{expires_at}',
            $3::jsonb
          ),
          updated_at = NOW()
        WHERE id = $1
        RETURNING public_token
      `;

      const result = await this.pool.query(query, [
        reportId,
        token,
        expiresAt ? JSON.stringify(expiresAt) : 'null',
      ]);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0].public_token;
    } catch (error) {
      logger.error('Error generating public link', { error, reportId });
      throw new Error('Failed to generate public link');
    }
  }

  /**
   * Revoke public link
   */
  async revokePublicLink(reportId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE saved_reports SET public_token = NULL, updated_at = NOW() WHERE id = $1',
        [reportId]
      );
    } catch (error) {
      logger.error('Error revoking public link', { error, reportId });
      throw new Error('Failed to revoke public link');
    }
  }

  /**
   * Get report by public token
   */
  async getReportByPublicToken(token: string): Promise<SavedReport | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM saved_reports WHERE public_token = $1',
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const report = result.rows[0];

      // Check if link has expired
      if (report.share_settings?.expires_at) {
        const expiresAt = new Date(report.share_settings.expires_at);
        if (expiresAt < new Date()) {
          return null;
        }
      }

      return report;
    } catch (error) {
      logger.error('Error fetching report by token', { error, token });
      throw new Error('Failed to fetch report');
    }
  }

  /**
   * Check if user has access to report
   */
  async checkAccess(reportId: string, userId: string, userRoles: string[]): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT id FROM saved_reports 
         WHERE id = $1 
         AND (
           created_by = $2 
           OR is_public = TRUE 
           OR $2 = ANY(shared_with_users)
           OR shared_with_roles && $3::text[]
         )`,
        [reportId, userId, userRoles]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking access', { error, reportId, userId });
      return false;
    }
  }

  /**
   * Generate a random token for public links
   */
  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

export default SavedReportService;
