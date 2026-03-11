import pool from '@config/database';
import { logger } from '@config/logger';
import type { CaseServiceAssignmentsPort } from '../types/ports';
import type { CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';

const normalizeProviderName = (name: string): string => name.trim().replace(/\s+/g, ' ');

const getExternalProviderById = async (
  providerId?: string | null
): Promise<{ id: string; provider_name: string } | null> => {
  if (!providerId) {
    return null;
  }

  const result = await pool.query(
    `
    SELECT id, provider_name
    FROM external_service_providers
    WHERE id = $1
    LIMIT 1
  `,
    [providerId]
  );

  return result.rows[0] || null;
};

const resolveExternalServiceProviderId = async (
  providerName?: string | null,
  providerType?: string | null,
  userId?: string
): Promise<{ providerId: string | null; providerName: string | null }> => {
  if (!providerName || !providerName.trim()) {
    return { providerId: null, providerName: null };
  }

  const normalizedName = normalizeProviderName(providerName);
  const existing = await pool.query(
    `
    SELECT id, provider_name
    FROM external_service_providers
    WHERE LOWER(BTRIM(provider_name)) = LOWER(BTRIM($1))
    LIMIT 1
  `,
    [normalizedName]
  );

  if (existing.rows[0]) {
    const row = existing.rows[0];
    if (providerType && providerType.trim()) {
      await pool.query(
        `
        UPDATE external_service_providers
        SET provider_type = COALESCE(provider_type, $1),
            modified_by = $2
        WHERE id = $3
      `,
        [providerType.trim(), userId || null, row.id]
      );
    }
    return { providerId: row.id, providerName: row.provider_name };
  }

  const inserted = await pool.query(
    `
    INSERT INTO external_service_providers (provider_name, provider_type, created_by, modified_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, provider_name
  `,
    [normalizedName, providerType?.trim() || null, userId || null, userId || null]
  );

  return {
    providerId: inserted.rows[0].id,
    providerName: inserted.rows[0].provider_name,
  };
};

export class CaseServicesRepository implements CaseServiceAssignmentsPort {
  async getCaseServices(caseId: string): Promise<unknown[]> {
    const result = await pool.query(
      `
      SELECT cs.*,
             esp.provider_name as external_service_provider_name,
             esp.provider_type as external_service_provider_type
      FROM case_services cs
      LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
      WHERE cs.case_id = $1
      ORDER BY cs.service_date DESC, cs.start_time DESC
    `,
      [caseId]
    );
    return result.rows;
  }

  async createCaseService(caseId: string, data: CreateCaseServiceDTO, userId?: string): Promise<unknown> {
    let providerResolution = await resolveExternalServiceProviderId(
      data.service_provider,
      data.service_type || null,
      userId
    );

    if (data.external_service_provider_id) {
      const selectedProvider = await getExternalProviderById(data.external_service_provider_id);
      if (selectedProvider) {
        providerResolution = {
          providerId: selectedProvider.id,
          providerName: selectedProvider.provider_name,
        };
      }
    }

    const result = await pool.query(
      `INSERT INTO case_services (
        case_id, service_name, service_type, service_provider, external_service_provider_id,
        service_date, start_time, end_time, duration_minutes,
        status, outcome, cost, currency, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        caseId,
        data.service_name,
        data.service_type || null,
        providerResolution.providerName || null,
        data.external_service_provider_id || providerResolution.providerId || null,
        data.service_date,
        data.start_time || null,
        data.end_time || null,
        data.duration_minutes || null,
        data.status || 'scheduled',
        data.outcome || null,
        data.cost || null,
        data.currency || 'CAD',
        data.notes || null,
        userId || null,
      ]
    );

    logger.info('Case service created', { caseId, serviceId: result.rows[0].id });

    const joined = await pool.query(
      `
      SELECT cs.*,
             esp.provider_name as external_service_provider_name,
             esp.provider_type as external_service_provider_type
      FROM case_services cs
      LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
      WHERE cs.id = $1
    `,
      [result.rows[0].id]
    );

    return joined.rows[0];
  }

  async updateCaseService(serviceId: string, data: UpdateCaseServiceDTO, userId?: string): Promise<unknown> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const payload: Record<string, unknown> = { ...data };

    if (data.service_provider !== undefined) {
      const providerResolution = await resolveExternalServiceProviderId(
        data.service_provider,
        data.service_type || null,
        userId
      );
      payload.service_provider = providerResolution.providerName;
      payload.external_service_provider_id = providerResolution.providerId;
    } else if (data.external_service_provider_id !== undefined) {
      const selectedProvider = await getExternalProviderById(data.external_service_provider_id);
      payload.service_provider = selectedProvider?.provider_name || null;
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(serviceId);
    await pool.query(
      `UPDATE case_services SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const result = await pool.query(
      `
      SELECT cs.*,
             esp.provider_name as external_service_provider_name,
             esp.provider_type as external_service_provider_type
      FROM case_services cs
      LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
      WHERE cs.id = $1
    `,
      [serviceId]
    );

    if (!result.rows[0]) {
      throw new Error('Service not found');
    }

    return result.rows[0];
  }

  async deleteCaseService(serviceId: string): Promise<void> {
    await pool.query(`DELETE FROM case_services WHERE id = $1`, [serviceId]);
    logger.info('Case service deleted', { serviceId });
  }
}
