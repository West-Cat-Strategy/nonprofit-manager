import { Pool, PoolClient } from 'pg';
import { logger } from '@config/logger';
import type {
  CaseService as CaseServiceType,
  CreateCaseServiceDTO,
  UpdateCaseServiceDTO,
} from '@app-types/case';
import { buildCaseOrganizationScopeSql, requireCaseOwnership } from './shared';

type PgExecutor = Pool | PoolClient;

interface ExternalServiceProviderRow {
  id: string;
  provider_name: string;
  provider_type?: string | null;
}

const normalizeProviderName = (name: string): string => name.trim().replace(/\s+/g, ' ');

const getScopedCaseServiceQuery = async (
  db: PgExecutor,
  serviceId: string,
  organizationId?: string
): Promise<{ id: string; case_id: string; account_id: string | null } | null> => {
  const result = await db.query<{ id: string; case_id: string; account_id: string | null }>(
    `SELECT cs.id,
            cs.case_id,
            COALESCE(c.account_id, con.account_id) AS account_id
     FROM case_services cs
     JOIN cases c ON c.id = cs.case_id
     LEFT JOIN contacts con ON con.id = c.contact_id
     WHERE cs.id = $1
       AND ${buildCaseOrganizationScopeSql('$2')}
     LIMIT 1`,
    [serviceId, organizationId || null]
  );

  return result.rows[0] ?? null;
};

const requireScopedCaseServiceQuery = async (
  db: PgExecutor,
  serviceId: string,
  organizationId?: string
): Promise<{ id: string; case_id: string; account_id: string | null }> => {
  const service = await getScopedCaseServiceQuery(db, serviceId, organizationId);
  if (!service) {
    throw Object.assign(new Error('Service not found'), {
      statusCode: 404,
      code: 'not_found',
    });
  }
  return service;
};

const getExternalProviderByIdQuery = async (
  db: PgExecutor,
  providerId?: string | null,
  accountId?: string | null
): Promise<ExternalServiceProviderRow | null> => {
  if (!providerId || !accountId) {
    return null;
  }

  const result = await db.query<ExternalServiceProviderRow>(
    `
    SELECT id, provider_name
    FROM external_service_providers
    WHERE id = $1
      AND account_id = $2
    LIMIT 1
  `,
    [providerId, accountId]
  );

  return result.rows[0] || null;
};

const resolveExternalServiceProviderIdQuery = async (
  db: PgExecutor,
  accountId: string | null,
  providerName?: string | null,
  providerType?: string | null,
  userId?: string
): Promise<{ providerId: string | null; providerName: string | null }> => {
  if (!providerName || !providerName.trim() || !accountId) {
    return { providerId: null, providerName: null };
  }

  const normalizedName = normalizeProviderName(providerName);
  const existing = await db.query<ExternalServiceProviderRow>(
    `
    SELECT id, provider_name
    FROM external_service_providers
    WHERE LOWER(BTRIM(provider_name)) = LOWER(BTRIM($1))
      AND account_id = $2
    LIMIT 1
  `,
    [normalizedName, accountId]
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
          AND account_id = $4
      `,
        [providerType.trim(), userId || null, row.id, accountId]
      );
    }

    return { providerId: row.id, providerName: row.provider_name };
  }

  const inserted = await db.query<ExternalServiceProviderRow>(
    `
    INSERT INTO external_service_providers (
      account_id, provider_name, provider_type, created_by, modified_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, provider_name
  `,
    [accountId, normalizedName, providerType?.trim() || null, userId || null, userId || null]
  );

  return {
    providerId: inserted.rows[0].id,
    providerName: inserted.rows[0].provider_name,
  };
};

const getCaseServiceByIdQuery = async (
  db: PgExecutor,
  serviceId: string,
  organizationId?: string
): Promise<CaseServiceType | null> => {
  const result = await db.query<CaseServiceType>(
    `
    SELECT cs.*,
           esp.provider_name as external_service_provider_name,
           esp.provider_type as external_service_provider_type
    FROM case_services cs
    JOIN cases c ON c.id = cs.case_id
    LEFT JOIN contacts con ON con.id = c.contact_id
    LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
    WHERE cs.id = $1
      AND ${buildCaseOrganizationScopeSql('$2')}
    LIMIT 1
  `,
    [serviceId, organizationId || null]
  );

  return result.rows[0] || null;
};

export const getCaseServicesQuery = async (
  db: PgExecutor,
  caseId: string,
  organizationId?: string
): Promise<CaseServiceType[]> => {
  await requireCaseOwnership(db, caseId, organizationId);
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
  userId?: string,
  organizationId?: string
): Promise<CaseServiceType> => {
  const ownership = await requireCaseOwnership(db, caseId, organizationId);
  const accountId = ownership.account_id;
  let providerResolution = await resolveExternalServiceProviderIdQuery(
    db,
    accountId,
    data.service_provider,
    data.service_type || null,
    userId
  );

  if (data.external_service_provider_id) {
    const selectedProvider = await getExternalProviderByIdQuery(
      db,
      data.external_service_provider_id,
      accountId
    );
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
      service_site_snapshot,
      service_date, start_time, end_time, duration_minutes,
      status, outcome, cost, currency, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      caseId,
      data.service_name,
      data.service_type || null,
      providerResolution.providerName || null,
      providerResolution.providerId || null,
      data.service_site_snapshot || null,
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

  const joined = await getCaseServiceByIdQuery(db, result.rows[0].id, organizationId);
  if (!joined) {
    throw new Error('Service not found');
  }

  return joined;
};

export const updateCaseServiceQuery = async (
  db: PgExecutor,
  serviceId: string,
  data: UpdateCaseServiceDTO,
  userId?: string,
  organizationId?: string
): Promise<CaseServiceType> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const payload: Record<string, unknown> = { ...data };
  const scopedService = await requireScopedCaseServiceQuery(db, serviceId, organizationId);
  const accountId = scopedService.account_id;

  if (data.service_provider !== undefined) {
    const providerResolution = await resolveExternalServiceProviderIdQuery(
      db,
      accountId,
      data.service_provider,
      data.service_type || null,
      userId
    );
    payload.service_provider = providerResolution.providerName;
    payload.external_service_provider_id = providerResolution.providerId;
  } else if (data.external_service_provider_id !== undefined) {
    const selectedProvider = await getExternalProviderByIdQuery(
      db,
      data.external_service_provider_id,
      accountId
    );
    payload.external_service_provider_id = selectedProvider?.id || null;
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
  values.push(scopedService.case_id);
  await db.query(
    `UPDATE case_services SET ${fields.join(', ')} WHERE id = $${idx} AND case_id = $${idx + 1} RETURNING *`,
    values
  );

  const result = await getCaseServiceByIdQuery(db, serviceId, organizationId);
  if (!result) {
    throw new Error('Service not found');
  }

  return result;
};

export const deleteCaseServiceQuery = async (
  db: PgExecutor,
  serviceId: string,
  organizationId?: string
): Promise<void> => {
  const scopedService = await requireScopedCaseServiceQuery(db, serviceId, organizationId);
  await db.query(`DELETE FROM case_services WHERE id = $1 AND case_id = $2`, [
    serviceId,
    scopedService.case_id,
  ]);
  logger.info('Case service deleted', { serviceId });
};
