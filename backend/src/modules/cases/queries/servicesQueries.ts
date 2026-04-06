import { Pool, PoolClient } from 'pg';
import { logger } from '@config/logger';
import type { CaseService as CaseServiceType, CreateCaseServiceDTO, UpdateCaseServiceDTO } from '@app-types/case';

type PgExecutor = Pool | PoolClient;

interface ExternalServiceProviderRow {
  id: string;
  provider_name: string;
  provider_type?: string | null;
}

const normalizeProviderName = (name: string): string => name.trim().replace(/\s+/g, ' ');

const getExternalProviderByIdQuery = async (
  db: PgExecutor,
  providerId?: string | null
): Promise<ExternalServiceProviderRow | null> => {
  if (!providerId) {
    return null;
  }

  const result = await db.query<ExternalServiceProviderRow>(
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

const resolveExternalServiceProviderIdQuery = async (
  db: PgExecutor,
  providerName?: string | null,
  providerType?: string | null,
  userId?: string
): Promise<{ providerId: string | null; providerName: string | null }> => {
  if (!providerName || !providerName.trim()) {
    return { providerId: null, providerName: null };
  }

  const normalizedName = normalizeProviderName(providerName);
  const existing = await db.query<ExternalServiceProviderRow>(
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
      await db.query(
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

  const inserted = await db.query<ExternalServiceProviderRow>(
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

const getCaseServiceByIdQuery = async (
  db: PgExecutor,
  serviceId: string
): Promise<CaseServiceType | null> => {
  const result = await db.query<CaseServiceType>(
    `
    SELECT cs.*,
           esp.provider_name as external_service_provider_name,
           esp.provider_type as external_service_provider_type
    FROM case_services cs
    LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
    WHERE cs.id = $1
    LIMIT 1
  `,
    [serviceId]
  );

  return result.rows[0] || null;
};

export const getCaseServicesQuery = async (
  db: PgExecutor,
  caseId: string
): Promise<CaseServiceType[]> => {
  const result = await db.query<CaseServiceType>(
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
};

export const createCaseServiceQuery = async (
  db: PgExecutor,
  caseId: string,
  data: CreateCaseServiceDTO,
  userId?: string
): Promise<CaseServiceType> => {
  let providerResolution = await resolveExternalServiceProviderIdQuery(
    db,
    data.service_provider,
    data.service_type || null,
    userId
  );

  if (data.external_service_provider_id) {
    const selectedProvider = await getExternalProviderByIdQuery(db, data.external_service_provider_id);
    if (selectedProvider) {
      providerResolution = {
        providerId: selectedProvider.id,
        providerName: selectedProvider.provider_name,
      };
    }
  }

  const result = await db.query<CaseServiceType>(
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

  const joined = await getCaseServiceByIdQuery(db, result.rows[0].id);
  if (!joined) {
    throw new Error('Service not found');
  }

  return joined;
};

export const updateCaseServiceQuery = async (
  db: PgExecutor,
  serviceId: string,
  data: UpdateCaseServiceDTO,
  userId?: string
): Promise<CaseServiceType> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const payload: Record<string, unknown> = { ...data };

  if (data.service_provider !== undefined) {
    const providerResolution = await resolveExternalServiceProviderIdQuery(
      db,
      data.service_provider,
      data.service_type || null,
      userId
    );
    payload.service_provider = providerResolution.providerName;
    payload.external_service_provider_id = providerResolution.providerId;
  } else if (data.external_service_provider_id !== undefined) {
    const selectedProvider = await getExternalProviderByIdQuery(db, data.external_service_provider_id);
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
  await db.query(
    `UPDATE case_services SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  const result = await getCaseServiceByIdQuery(db, serviceId);
  if (!result) {
    throw new Error('Service not found');
  }

  return result;
};

export const deleteCaseServiceQuery = async (
  db: PgExecutor,
  serviceId: string
): Promise<void> => {
  await db.query(`DELETE FROM case_services WHERE id = $1`, [serviceId]);
  logger.info('Case service deleted', { serviceId });
};
