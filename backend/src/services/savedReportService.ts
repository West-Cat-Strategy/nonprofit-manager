/**
 * Saved Report Service
 * Handles CRUD operations for saved reports
 */

import crypto from 'crypto';
import { Pool } from 'pg';
import { logger } from '@config/logger';
import type {
  SavedReport,
  SavedReportSummary,
  SavedReportsListPage,
  CreateSavedReportRequest,
  UpdateSavedReportRequest,
} from '@app-types/savedReport';

interface SharePrincipalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface SharePrincipalRole {
  name: string;
  label: string;
}

interface SharePrincipalsResult {
  users: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
  }>;
  roles: SharePrincipalRole[];
}

const SHARE_ROLES: SharePrincipalRole[] = [
  { name: 'admin', label: 'Admin' },
  { name: 'manager', label: 'Manager' },
  { name: 'staff', label: 'Staff' },
  { name: 'member', label: 'Member' },
  { name: 'volunteer', label: 'Volunteer' },
];

const SAVED_REPORT_BASE_COLUMNS = `
  id,
  name,
  description,
  entity,
  created_by,
  created_at,
  updated_at,
  is_public,
  shared_with_users,
  shared_with_roles,
  public_token,
  share_settings
`;

const SAVED_REPORT_DETAIL_COLUMNS = `${SAVED_REPORT_BASE_COLUMNS}, report_definition`;

export class SavedReportService {
  constructor(private pool: Pool) { }

  private async assertOwnerOrAdmin(
    reportId: string,
    actorUserId: string,
    actorRole: string
  ): Promise<void> {
    const result = await this.pool.query<{ created_by: string | null }>(
      `SELECT created_by
       FROM saved_reports
       WHERE id = $1
       LIMIT 1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      throw new Error('Report not found');
    }

    const ownerId = result.rows[0].created_by;
    if (actorRole === 'admin' || (ownerId && ownerId === actorUserId)) {
      return;
    }

    throw new Error('Only report owner or admin can modify sharing settings');
  }

  /**
   * Get all saved reports (optionally filter by user or entity)
   */
  async getSavedReports(
    userId?: string,
    entity?: string,
    userRoles: string[] = [],
    options: { page?: number; limit?: number; summary?: boolean } = {}
  ): Promise<SavedReportsListPage<SavedReport | SavedReportSummary>> {
    try {
      const page = Math.max(1, Number(options.page || 1));
      const limit = Math.max(1, Math.min(Number(options.limit || 20), 100));
      const offset = (page - 1) * limit;
      const summary = options.summary !== false;
      const selectColumns = summary ? SAVED_REPORT_BASE_COLUMNS : SAVED_REPORT_DETAIL_COLUMNS;

      let whereClause = `
        FROM saved_reports
        WHERE (
          is_public = TRUE
          OR created_by = $1
          OR ($1 IS NOT NULL AND $1 = ANY(COALESCE(shared_with_users, '{}'::uuid[])))
          OR (COALESCE(shared_with_roles, '{}'::text[]) && $2::text[])
        )
      `;
      const params: unknown[] = [userId || null, userRoles];
      let nextParamIndex = 3;

      if (entity) {
        whereClause += ` AND entity = $${nextParamIndex}`;
        params.push(entity);
        nextParamIndex += 1;
      }

      const countResult = await this.pool.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total ${whereClause}`,
        params
      );
      const total = Number.parseInt(countResult.rows[0]?.total || '0', 10);

      const result = await this.pool.query(
        `SELECT ${selectColumns}
         ${whereClause}
         ORDER BY updated_at DESC
         LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}`,
        [...params, limit, offset]
      );

      return {
        items: result.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching saved reports', { error, userId, entity, userRoles });
      throw Object.assign(new Error('Failed to fetch saved reports'), { cause: error });
    }
  }

  /**
   * Get a single saved report by ID
   */
  async getSavedReportById(id: string, userId?: string, userRoles: string[] = []): Promise<SavedReport | null> {
    try {
      const query = `
        SELECT ${SAVED_REPORT_DETAIL_COLUMNS}
        FROM saved_reports
        WHERE id = $1
          AND (
            is_public = TRUE
            OR created_by = $2
            OR ($2 IS NOT NULL AND $2 = ANY(COALESCE(shared_with_users, '{}'::uuid[])))
            OR (COALESCE(shared_with_roles, '{}'::text[]) && $3::text[])
          )
      `;
      const result = await this.pool.query(query, [id, userId || null, userRoles]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching saved report by ID', { error, id, userId, userRoles });
      throw Object.assign(new Error('Failed to fetch saved report'), { cause: error });
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
      throw Object.assign(new Error('Failed to create saved report'), { cause: error });
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
        SELECT id, name, description, entity, created_by, created_at, updated_at, is_public,
               shared_with_users, shared_with_roles, public_token, share_settings, report_definition
        FROM saved_reports
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
      throw Object.assign(new Error('Failed to update saved report'), { cause: error });
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
      throw Object.assign(new Error('Failed to delete saved report'), { cause: error });
    }
  }

  async getSharePrincipals(search?: string, limit = 25): Promise<SharePrincipalsResult> {
    try {
      const safeLimit = Math.max(1, Math.min(limit, 50));
      const term = search?.trim() || null;

      const usersResult = await this.pool.query<SharePrincipalUser>(
        `SELECT id, email, first_name, last_name
         FROM users
         WHERE is_active = true
           AND (
             $1::text IS NULL
             OR email ILIKE '%' || $1 || '%'
             OR first_name ILIKE '%' || $1 || '%'
             OR last_name ILIKE '%' || $1 || '%'
           )
         ORDER BY first_name ASC, last_name ASC
         LIMIT $2`,
        [term, safeLimit]
      );

      return {
        users: usersResult.rows.map((row) => ({
          ...row,
          full_name: `${row.first_name} ${row.last_name}`.trim(),
        })),
        roles: SHARE_ROLES,
      };
    } catch (error) {
      logger.error('Error fetching share principals', { error, search, limit });
      throw Object.assign(new Error('Failed to fetch share principals'), { cause: error });
    }
  }

  /**
   * Share report with users or roles
   */
  async shareReport(
    reportId: string,
    actorUserId: string,
    actorRole: string,
    userIds?: string[],
    roleNames?: string[],
    shareSettings?: { can_edit: boolean; expires_at?: string }
  ): Promise<SavedReport> {
    try {
      await this.assertOwnerOrAdmin(reportId, actorUserId, actorRole);

      const dedupedUserIds = Array.from(new Set((userIds || []).filter(Boolean)));
      const dedupedRoleNames = Array.from(new Set((roleNames || []).filter(Boolean)));
      const nextShareSettings = shareSettings ? JSON.stringify(shareSettings) : null;

      const query = `
        UPDATE saved_reports
        SET
          shared_with_users = (
            SELECT ARRAY(
              SELECT DISTINCT x
              FROM unnest(COALESCE(shared_with_users, '{}'::uuid[]) || $2::uuid[]) AS x
            )
          ),
          shared_with_roles = (
            SELECT ARRAY(
              SELECT DISTINCT x
              FROM unnest(COALESCE(shared_with_roles, '{}'::text[]) || $3::text[]) AS x
            )
          ),
          share_settings = CASE
            WHEN $4::jsonb IS NULL THEN share_settings
            ELSE COALESCE(share_settings, '{}'::jsonb) || $4::jsonb
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        reportId,
        dedupedUserIds,
        dedupedRoleNames,
        nextShareSettings,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error sharing report', { error, reportId, actorUserId, actorRole });
      if (error instanceof Error) {
        throw error;
      }
      throw Object.assign(new Error('Failed to share report'), { cause: error });
    }
  }

  /**
   * Remove share access for specific users or roles
   */
  async removeShare(
    reportId: string,
    actorUserId: string,
    actorRole: string,
    userIds?: string[],
    roleNames?: string[]
  ): Promise<SavedReport> {
    try {
      await this.assertOwnerOrAdmin(reportId, actorUserId, actorRole);

      const dedupedUserIds = Array.from(new Set((userIds || []).filter(Boolean)));
      const dedupedRoleNames = Array.from(new Set((roleNames || []).filter(Boolean)));

      if (dedupedUserIds.length === 0 && dedupedRoleNames.length === 0) {
        throw new Error('No users or roles specified to remove');
      }

      const query = `
        UPDATE saved_reports
        SET
          shared_with_users = (
            SELECT ARRAY(
              SELECT x
              FROM unnest(COALESCE(shared_with_users, '{}'::uuid[])) AS x
              WHERE NOT (x = ANY($2::uuid[]))
            )
          ),
          shared_with_roles = (
            SELECT ARRAY(
              SELECT x
              FROM unnest(COALESCE(shared_with_roles, '{}'::text[])) AS x
              WHERE NOT (x = ANY($3::text[]))
            )
          ),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await this.pool.query(query, [reportId, dedupedUserIds, dedupedRoleNames]);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error removing share', { error, reportId, actorUserId, actorRole });
      if (error instanceof Error) {
        throw error;
      }
      throw Object.assign(new Error('Failed to remove share'), { cause: error });
    }
  }

  /**
   * Generate a public shareable link
   */
  async generatePublicLink(reportId: string, expiresAt?: string): Promise<string> {
    try {
      const token = crypto.randomBytes(24).toString('base64url');

      const query = `
        UPDATE saved_reports
        SET
          public_token = $2,
          share_settings = CASE
            WHEN $3::jsonb IS NULL THEN COALESCE(share_settings, '{}'::jsonb) - 'expires_at'
            ELSE jsonb_set(
              COALESCE(share_settings, '{}'::jsonb),
              '{expires_at}',
              $3::jsonb
            )
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING public_token
      `;

      const result = await this.pool.query(query, [
        reportId,
        token,
        expiresAt ? JSON.stringify(expiresAt) : null,
      ]);

      if (result.rows.length === 0) {
        throw new Error('Report not found');
      }

      return result.rows[0].public_token;
    } catch (error) {
      logger.error('Error generating public link', { error, reportId });
      throw Object.assign(new Error('Failed to generate public link'), { cause: error });
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
      throw Object.assign(new Error('Failed to revoke public link'), { cause: error });
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

      if (report.share_settings?.expires_at) {
        const expiresAt = new Date(report.share_settings.expires_at);
        if (expiresAt < new Date()) {
          return null;
        }
      }

      return report;
    } catch (error) {
      logger.error('Error fetching report by token', { error, token });
      throw Object.assign(new Error('Failed to fetch report'), { cause: error });
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
           OR $2 = ANY(COALESCE(shared_with_users, '{}'::uuid[]))
           OR COALESCE(shared_with_roles, '{}'::text[]) && $3::text[]
         )`,
        [reportId, userId, userRoles]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking access', { error, reportId, userId });
      return false;
    }
  }
}

export default SavedReportService;
