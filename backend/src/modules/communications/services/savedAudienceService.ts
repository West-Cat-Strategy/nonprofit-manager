import pool from '@config/database';
import type {
  CommunicationAudience,
  CommunicationAudiencePreview,
  CommunicationAudiencePreviewRequest,
  CommunicationProviderAudience,
  CreateCommunicationAudienceRequest,
} from '@app-types/communications';
import {
  assertUuidList,
  CommunicationsValidationError,
  LOCAL_AUDIENCE_ID,
  mapAudienceRow,
  uniqueStrings,
} from './communicationsServiceHelpers';
import type { ContactRecipientRow, SavedAudienceRow } from './communicationsServiceHelpers';

export const getContactIdsFromFilters = (filters: Record<string, unknown>): string[] => {
  if (filters.source !== 'communications_selected_contacts' || !Array.isArray(filters.contactIds)) {
    throw new CommunicationsValidationError('Saved audience uses an unsupported filter shape');
  }
  const contactIds = uniqueStrings(
    filters.contactIds.filter((value): value is string => typeof value === 'string')
  );
  if (contactIds.length === 0) {
    throw new CommunicationsValidationError('Saved audience has no contacts');
  }
  assertUuidList(contactIds, 'Saved audience contactIds');
  return contactIds;
};

export const loadSavedAudience = async (audienceId: string): Promise<CommunicationAudience | null> => {
  const result = await pool.query<SavedAudienceRow>(
    `SELECT id, name, description, filters, source_count, scope_account_ids,
            status, created_at, updated_at, created_by
       FROM saved_audiences
      WHERE id = $1`,
    [audienceId]
  );
  return result.rows[0] ? mapAudienceRow(result.rows[0]) : null;
};

export const getPriorRunTargetContactIds = async (
  runIds: readonly string[] = [],
  requesterScopeAccountIds?: string[]
): Promise<string[]> => {
  const uniqueRunIds = uniqueStrings(runIds);
  if (uniqueRunIds.length === 0) {
    return [];
  }
  assertUuidList(uniqueRunIds, 'priorRunSuppressionIds');
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<{ audience_snapshot: Record<string, unknown> | null }>(
    `SELECT audience_snapshot
       FROM campaign_runs
      WHERE id = ANY($1::uuid[])
        AND ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])`,
    [uniqueRunIds, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  if (result.rows.length !== uniqueRunIds.length) {
    throw new CommunicationsValidationError('Prior campaign run suppression was not found');
  }
  return uniqueStrings(
    result.rows.flatMap((row) =>
      Array.isArray(row.audience_snapshot?.targetContactIds)
        ? (row.audience_snapshot.targetContactIds as string[])
        : []
    )
  );
};

export const getExclusionContactIds = async (
  request: CommunicationAudiencePreviewRequest,
  requesterScopeAccountIds?: string[]
): Promise<string[]> => {
  const exclusionIds = uniqueStrings(request.exclusionAudienceIds ?? []);
  assertUuidList(exclusionIds, 'exclusionAudienceIds');
  const excluded = new Set<string>();

  for (const audienceId of exclusionIds) {
    const audience = await loadSavedAudience(audienceId);
    if (!audience || audience.status !== 'active') {
      throw new CommunicationsValidationError('Suppression saved audience was not found or is archived');
    }
    getContactIdsFromFilters(audience.filters).forEach((contactId) => excluded.add(contactId));
  }

  const priorRunContactIds = await getPriorRunTargetContactIds(
    request.priorRunSuppressionIds ?? [],
    requesterScopeAccountIds
  );
  priorRunContactIds.forEach((contactId) => excluded.add(contactId));
  return Array.from(excluded);
};

export const resolveRequestedContactIds = async (
  request: CommunicationAudiencePreviewRequest,
  requesterScopeAccountIds?: string[]
): Promise<string[]> => {
  let directContactIds = uniqueStrings(request.contactIds ?? []);
  if (directContactIds.length > 0) {
    assertUuidList(directContactIds, 'contactIds');
  } else if (!request.includeAudienceId) {
    throw new CommunicationsValidationError('Choose a saved audience or contact selection');
  } else {
    const audience = await loadSavedAudience(request.includeAudienceId);
    if (!audience || audience.status !== 'active') {
      throw new CommunicationsValidationError('Saved audience target was not found or is archived');
    }
    directContactIds = getContactIdsFromFilters(audience.filters);
  }

  const excluded = new Set(await getExclusionContactIds(request, requesterScopeAccountIds));
  return directContactIds.filter((contactId) => !excluded.has(contactId));
};

const hasContactSuppressionEvidenceTable = async (): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass('public.contact_suppression_evidence') IS NOT NULL AS exists`
  );
  return Boolean(result.rows[0]?.exists);
};

export const loadEligibleContacts = async (
  contactIds: string[],
  requesterScopeAccountIds?: string[]
): Promise<ContactRecipientRow[]> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const suppressionSelect = (await hasContactSuppressionEvidenceTable())
    ? `EXISTS (
              SELECT 1
                FROM contact_suppression_evidence cse
               WHERE cse.contact_id = c.id
                 AND cse.is_active = true
                 AND (cse.channel = 'email' OR cse.channel = 'all')
                 AND (cse.starts_at IS NULL OR cse.starts_at <= CURRENT_TIMESTAMP)
                 AND (cse.expires_at IS NULL OR cse.expires_at > CURRENT_TIMESTAMP)
            )`
    : 'false';
  const result = await pool.query<ContactRecipientRow>(
    `SELECT c.id,
            c.account_id,
            c.first_name,
            c.last_name,
            c.email,
            c.do_not_email,
            ${suppressionSelect} AS suppressed
       FROM contacts c
      WHERE c.id = ANY($1::uuid[])
        AND ($2::uuid[] IS NULL OR c.account_id = ANY($2::uuid[]) OR c.account_id IS NULL)`,
    [contactIds, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return result.rows;
};

export const getLocalAudience = async (
  requesterScopeAccountIds?: string[]
): Promise<CommunicationProviderAudience> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM contacts c
      WHERE c.email IS NOT NULL
        AND btrim(c.email) <> ''
        AND COALESCE(c.do_not_email, false) = false
        AND ($1::uuid[] IS NULL OR c.account_id = ANY($1::uuid[]) OR c.account_id IS NULL)`,
    [scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );

  return {
    id: LOCAL_AUDIENCE_ID,
    name: 'CRM Email Audience',
    memberCount: Number(result.rows[0]?.count ?? 0),
    createdAt: new Date(0),
    doubleOptIn: false,
    provider: 'local_email',
    description: 'Eligible CRM contacts with email addresses.',
    isDefault: true,
  };
};

export const isLocalAudienceId = (audienceId?: string | null): boolean =>
  !audienceId || audienceId === LOCAL_AUDIENCE_ID || audienceId === 'local_email';

export const loadLocalAudienceContactIds = async (
  requesterScopeAccountIds?: string[]
): Promise<string[]> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<{ id: string }>(
    `SELECT c.id
       FROM contacts c
      WHERE c.email IS NOT NULL
        AND btrim(c.email) <> ''
        AND COALESCE(c.do_not_email, false) = false
        AND ($1::uuid[] IS NULL OR c.account_id = ANY($1::uuid[]) OR c.account_id IS NULL)
      ORDER BY c.created_at DESC, c.id ASC`,
    [scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return result.rows.map((row) => row.id);
};

export const listAudiences = async (
  requesterScopeAccountIds?: string[]
): Promise<CommunicationAudience[]> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<SavedAudienceRow>(
    `SELECT id, name, description, filters, source_count, scope_account_ids,
            status, created_at, updated_at, created_by
       FROM saved_audiences
      WHERE status = 'active'
        AND ($1::uuid[] IS NULL OR scope_account_ids && $1::uuid[])
      ORDER BY updated_at DESC, name ASC`,
    [scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return result.rows.map(mapAudienceRow);
};

export const archiveAudience = async (
  audienceId: string,
  userId?: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationAudience | null> => {
  assertUuidList([audienceId], 'audienceId');
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<SavedAudienceRow>(
    `UPDATE saved_audiences
        SET status = 'archived',
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND status = 'active'
        AND ($3::uuid[] IS NULL OR scope_account_ids && $3::uuid[])
      RETURNING id, name, description, filters, source_count, scope_account_ids,
                status, created_at, updated_at, created_by`,
    [audienceId, userId ?? null, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return result.rows[0] ? mapAudienceRow(result.rows[0]) : null;
};

export const createAudience = async (
  request: CreateCommunicationAudienceRequest,
  userId?: string
): Promise<CommunicationAudience> => {
  const contactIds = getContactIdsFromFilters({ ...request.filters });
  const contacts = await loadEligibleContacts(contactIds, request.scopeAccountIds);
  if (contacts.length !== contactIds.length) {
    throw new CommunicationsValidationError('Saved audience includes contacts that do not exist');
  }
  const scopeAccountIds = uniqueStrings(
    contacts.map((contact) => contact.account_id).filter((value): value is string => Boolean(value))
  );
  const filters = {
    ...request.filters,
    provider: request.filters.provider ?? 'local_email',
  };
  const result = await pool.query<SavedAudienceRow>(
    `INSERT INTO saved_audiences (
       name, description, filters, source_count, scope_account_ids, created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING id, name, description, filters, source_count, scope_account_ids,
               status, created_at, updated_at, created_by`,
    [
      request.name.trim(),
      request.description?.trim() || null,
      JSON.stringify(filters),
      contactIds.length,
      scopeAccountIds,
      userId ?? null,
    ]
  );
  return mapAudienceRow(result.rows[0]);
};

export const previewAudience = async (
  request: CommunicationAudiencePreviewRequest,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationAudiencePreview> => {
  const requestedContactIds = await resolveRequestedContactIds(request, requesterScopeAccountIds);
  const contacts = await loadEligibleContacts(requestedContactIds, requesterScopeAccountIds);
  const foundContactIds = new Set(contacts.map((contact) => contact.id));
  const targetContactIds: string[] = [];
  const suppressedContactIds: string[] = [];
  let missingEmailCount = requestedContactIds.filter((id) => !foundContactIds.has(id)).length;
  let doNotEmailCount = 0;
  let suppressedCount = 0;

  for (const contact of contacts) {
    if (!contact.email) {
      missingEmailCount++;
      continue;
    }
    if (contact.do_not_email) {
      doNotEmailCount++;
      suppressedContactIds.push(contact.id);
      continue;
    }
    if (contact.suppressed) {
      suppressedCount++;
      suppressedContactIds.push(contact.id);
      continue;
    }
    targetContactIds.push(contact.id);
  }

  return {
    requestedContactCount: requestedContactIds.length,
    eligibleContactCount: targetContactIds.length,
    missingEmailCount,
    doNotEmailCount,
    suppressedCount,
    targetContactIds,
    suppressedContactIds,
  };
};
