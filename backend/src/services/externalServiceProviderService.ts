import { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type { ExternalServiceProvider } from '@app-types/case';

interface ListOptions {
  accountId: string;
  search?: string;
  provider_type?: string;
  limit?: number;
  include_inactive?: boolean;
}

interface CreateExternalServiceProviderDTO {
  provider_name: string;
  provider_type?: string;
  notes?: string;
  is_active?: boolean;
}

interface UpdateExternalServiceProviderDTO {
  provider_name?: string;
  provider_type?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export class ExternalServiceProviderService {
  constructor(private pool: Pool) {}

  private normalizeProviderName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  async listProviders(options: ListOptions): Promise<ExternalServiceProvider[]> {
    const filters: string[] = ['esp.account_id = $1'];
    const params: unknown[] = [options.accountId];

    if (options.search?.trim()) {
      params.push(`%${options.search.trim()}%`);
      filters.push(`esp.provider_name ILIKE $${params.length}`);
    }

    if (options.provider_type?.trim()) {
      params.push(options.provider_type.trim());
      filters.push(`esp.provider_type = $${params.length}`);
    }

    if (!options.include_inactive) {
      filters.push('esp.is_active = true');
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const limit = Math.max(1, Math.min(options.limit || 100, 200));

    params.push(limit);

    const result = await this.pool.query(
      `
      SELECT
        esp.*,
        COUNT(cs.id) FILTER (WHERE linked_case.id IS NOT NULL)::int AS attached_services_count,
        COUNT(DISTINCT cs.case_id) FILTER (WHERE linked_case.id IS NOT NULL)::int AS attached_cases_count
      FROM external_service_providers esp
      LEFT JOIN case_services cs ON cs.external_service_provider_id = esp.id
      LEFT JOIN cases linked_case ON linked_case.id = cs.case_id
        AND linked_case.account_id = esp.account_id
      ${whereClause}
      GROUP BY esp.id
      ORDER BY esp.provider_name ASC
      LIMIT $${params.length}
    `,
      params
    );

    return result.rows;
  }

  async createProvider(
    accountId: string,
    data: CreateExternalServiceProviderDTO,
    userId?: string
  ): Promise<ExternalServiceProvider> {
    const normalizedName = this.normalizeProviderName(data.provider_name);
    const existing = await this.pool.query(
      `
      SELECT id
      FROM external_service_providers
      WHERE LOWER(BTRIM(provider_name)) = LOWER(BTRIM($1))
        AND account_id = $2
      LIMIT 1
    `,
      [normalizedName, accountId]
    );

    if (existing.rows[0]) {
      throw new Error('External service provider already exists');
    }

    const result = await this.pool.query(
      `
      INSERT INTO external_service_providers (
        account_id, provider_name, provider_type, notes, is_active, created_by, modified_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        accountId,
        normalizedName,
        data.provider_type?.trim() || null,
        data.notes?.trim() || null,
        data.is_active ?? true,
        userId || null,
        userId || null,
      ]
    );

    logger.info('External service provider created', { providerId: result.rows[0].id, providerName: normalizedName });
    return result.rows[0];
  }

  async updateProvider(
    accountId: string,
    id: string,
    data: UpdateExternalServiceProviderDTO,
    userId?: string
  ): Promise<ExternalServiceProvider | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.provider_name !== undefined) {
      fields.push(`provider_name = $${idx++}`);
      values.push(this.normalizeProviderName(data.provider_name));
    }

    if (data.provider_type !== undefined) {
      fields.push(`provider_type = $${idx++}`);
      values.push(data.provider_type?.trim() || null);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(data.notes?.trim() || null);
    }

    if (data.is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.is_active);
    }

    if (fields.length === 0) {
      return null;
    }

    fields.push(`modified_by = $${idx++}`);
    values.push(userId || null);

    values.push(id, accountId);

    const result = await this.pool.query(
      `UPDATE external_service_providers
       SET ${fields.join(', ')}
       WHERE id = $${idx}
         AND account_id = $${idx + 1}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteProvider(accountId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE external_service_providers
       SET is_active = false
       WHERE id = $1
         AND account_id = $2
       RETURNING id`,
      [id, accountId]
    );
    return Boolean(result.rows[0]);
  }
}

const externalServiceProviderServiceInstance = new ExternalServiceProviderService(pool);

export const listProviders = externalServiceProviderServiceInstance.listProviders.bind(externalServiceProviderServiceInstance);
export const createProvider = externalServiceProviderServiceInstance.createProvider.bind(externalServiceProviderServiceInstance);
export const updateProvider = externalServiceProviderServiceInstance.updateProvider.bind(externalServiceProviderServiceInstance);
export const deleteProvider = externalServiceProviderServiceInstance.deleteProvider.bind(externalServiceProviderServiceInstance);
