/**
 * Mailchimp Service
 * Handles email marketing integration with Mailchimp
 */

import { logger } from '@config/logger';
import pool from '@config/database';
import type {
  MailchimpStatus,
  MailchimpList,
  MailchimpMember,
  AddMemberRequest,
  SyncContactRequest,
  BulkSyncRequest,
  BulkSyncResponse,
  SyncResult,
  MailchimpTag,
  UpdateTagsRequest,
  MailchimpCampaign,
  SavedAudience,
  CreateSavedAudienceRequest,
  CampaignRun,
  CampaignRunStatus,
  MailchimpCampaignTargetingCounts,
  CreateSegmentRequest,
  MailchimpSegment,
  CreateCampaignRequest,
  CommunicationsSelectedContactsAudienceFilters,
  MailchimpWebhookPayload,
} from '@app-types/mailchimp';
import { resolveMailchimpCampaignContent } from '@services/template/emailCampaignRenderer';
import {
  assertMailchimpConfigured,
  isMailchimpConfigured as getMailchimpConfigured,
  mailchimpClient,
  warnIfMailchimpNotConfigured,
} from './mailchimpClient';
import {
  mapMailchimpCampaign,
  mapMailchimpList,
  mapMailchimpMember,
  mapMailchimpSegment,
  mapMailchimpTag,
} from './mailchimpMappers';
import {
  buildActiveTagUpdates,
  buildCampaignContentPayload,
  buildCampaignCreatePayload,
  buildCampaignSchedulePayload,
  buildContactMergeFields,
  buildMemberUpsertPayload,
  buildSegmentPayload,
  buildTagUpdates,
  createSkippedSyncResult,
  getSubscriberHash,
  isMailchimpNotFoundError,
  type MailchimpContactRow,
} from './mailchimpPayloads';

const CONTACT_SELECT_QUERY = `SELECT id AS contact_id, account_id, first_name, last_name, email, phone,
        address_line1, address_line2, city, state_province, postal_code, country,
        do_not_email
 FROM contacts WHERE id = $1`;

interface SavedAudienceRow {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown>;
  source_count: number;
  scope_account_ids: string[] | null;
  status: SavedAudience['status'];
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

interface CampaignRunRow {
  id: string;
  provider: 'mailchimp';
  provider_campaign_id: string | null;
  title: string;
  list_id: string;
  include_audience_id: string | null;
  exclusion_audience_ids: string[];
  suppression_snapshot: unknown[];
  test_recipients: string[];
  audience_snapshot: Record<string, unknown>;
  requested_send_time: Date | null;
  status: CampaignRunStatus;
  counts: Record<string, unknown>;
  scope_account_ids: string[] | null;
  failure_message: string | null;
  requested_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface PreparedCampaignTargeting {
  providerSegmentId?: number;
  audienceSnapshot: Record<string, unknown>;
  counts: MailchimpCampaignTargetingCounts;
  suppressionSnapshot: unknown[];
  scopeAccountIds: string[];
}

interface ContactScopeRow {
  id: string;
  account_id: string | null;
}

export class CampaignTargetingValidationError extends Error {
  statusCode = 400;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const throwCampaignTargetingValidation = (message: string): never => {
  throw new CampaignTargetingValidationError(message);
};

const uniqueStrings = (values: readonly string[] = []): string[] =>
  Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));

const assertUuidList = (values: readonly string[], label: string): void => {
  const invalid = values.find((value) => !uuidPattern.test(value));
  if (invalid) {
    throwCampaignTargetingValidation(`${label} must contain only UUID values`);
  }
};

const validateSavedAudienceFilters = (
  filters: unknown,
  listId?: string,
  audienceName = 'Saved audience'
): CommunicationsSelectedContactsAudienceFilters => {
  if (
    !isObjectRecord(filters) ||
    filters.source !== 'communications_selected_contacts' ||
    !Array.isArray(filters.contactIds) ||
    typeof filters.listId !== 'string' ||
    Object.keys(filters).some((key) => !['source', 'contactIds', 'listId'].includes(key))
  ) {
    return throwCampaignTargetingValidation(
      `${audienceName} uses an unsupported filter shape`
    );
  }

  if (!filters.listId.trim()) {
    return throwCampaignTargetingValidation(`${audienceName} requires a Mailchimp list`);
  }

  if (listId && filters.listId !== listId) {
    return throwCampaignTargetingValidation(
      `${audienceName} belongs to a different Mailchimp audience`
    );
  }

  const contactIds = uniqueStrings(filters.contactIds);
  if (contactIds.length === 0) {
    return throwCampaignTargetingValidation(`${audienceName} has no contacts`);
  }
  if (contactIds.length > 500) {
    return throwCampaignTargetingValidation(`${audienceName} can include at most 500 contacts`);
  }
  assertUuidList(contactIds, `${audienceName} contactIds`);

  return {
    source: 'communications_selected_contacts',
    contactIds,
    listId: filters.listId,
  };
};

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? uniqueStrings(value.filter((item): item is string => typeof item === 'string'))
    : [];

async function loadContactScopes(contactIds: string[]): Promise<ContactScopeRow[]> {
  const result = await pool.query<ContactScopeRow>(
    `SELECT id, account_id
     FROM contacts
     WHERE id = ANY($1::uuid[])`,
    [contactIds]
  );
  return result.rows;
}

function assertContactsInRequesterScope(
  rows: ContactScopeRow[],
  requesterScopeAccountIds?: string[]
): void {
  const scope = uniqueStrings(requesterScopeAccountIds ?? []);
  if (scope.length === 0) {
    return;
  }

  const allowed = new Set(scope);
  const outOfScope = rows.find((row) => !row.account_id || !allowed.has(row.account_id));
  if (outOfScope) {
    throwCampaignTargetingValidation('Saved audience includes contacts outside your data scope');
  }
}

async function validateSelectedContactFilters(
  filters: CommunicationsSelectedContactsAudienceFilters,
  requesterScopeAccountIds?: string[]
): Promise<{ sourceCount: number; scopeAccountIds: string[] }> {
  const rows = await loadContactScopes(filters.contactIds);
  if (rows.length !== filters.contactIds.length) {
    throwCampaignTargetingValidation('Saved audience includes contacts that do not exist');
  }
  assertContactsInRequesterScope(rows, requesterScopeAccountIds);

  return {
    sourceCount: rows.length,
    scopeAccountIds: uniqueStrings(rows.map((row) => row.account_id).filter(Boolean) as string[]),
  };
}

const mapSavedAudienceRow = (row: SavedAudienceRow): SavedAudience => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  filters: row.filters ?? {},
  sourceCount: Number(row.source_count ?? 0),
  scopeAccountIds: row.scope_account_ids ?? [],
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

const mapCampaignRunRow = (row: CampaignRunRow): CampaignRun => ({
  id: row.id,
  provider: row.provider,
  providerCampaignId: row.provider_campaign_id,
  title: row.title,
  listId: row.list_id,
  includeAudienceId: row.include_audience_id,
  exclusionAudienceIds: row.exclusion_audience_ids ?? [],
  suppressionSnapshot: row.suppression_snapshot ?? [],
  testRecipients: row.test_recipients ?? [],
  audienceSnapshot: row.audience_snapshot ?? {},
  requestedSendTime: row.requested_send_time,
  status: row.status,
  counts: row.counts ?? {},
  scopeAccountIds: row.scope_account_ids ?? [],
  failureMessage: row.failure_message,
  requestedBy: row.requested_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function listSavedAudiences(
  status: SavedAudience['status'] = 'active',
  requesterScopeAccountIds?: string[]
): Promise<SavedAudience[]> {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<SavedAudienceRow>(
    `SELECT id, name, description, filters, source_count, scope_account_ids,
            status, created_at, updated_at, created_by
     FROM saved_audiences
     WHERE status = $1
       AND ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])
     ORDER BY updated_at DESC, name ASC`,
    [status, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );

  return result.rows.map(mapSavedAudienceRow);
}

async function getSavedAudience(audienceId: string): Promise<SavedAudience | null> {
  const result = await pool.query<SavedAudienceRow>(
    `SELECT id, name, description, filters, source_count, scope_account_ids,
            status, created_at, updated_at, created_by
     FROM saved_audiences
     WHERE id = $1`,
    [audienceId]
  );

  return result.rows[0] ? mapSavedAudienceRow(result.rows[0]) : null;
}

function resolveSavedAudienceFilters(
  audience: SavedAudience,
  listId: string
): CommunicationsSelectedContactsAudienceFilters {
  return validateSavedAudienceFilters(audience.filters, listId, `Saved audience "${audience.name}"`);
}

export async function createSavedAudience(
  request: CreateSavedAudienceRequest,
  userId?: string
): Promise<SavedAudience> {
  const filters = validateSavedAudienceFilters(request.filters);
  const validation = await validateSelectedContactFilters(filters, request.scopeAccountIds);

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
      validation.sourceCount,
      validation.scopeAccountIds,
      userId ?? null,
    ]
  );

  return mapSavedAudienceRow(result.rows[0]);
}

export async function archiveSavedAudience(
  audienceId: string,
  userId?: string,
  requesterScopeAccountIds?: string[]
): Promise<SavedAudience | null> {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<SavedAudienceRow>(
    `UPDATE saved_audiences
     SET status = 'archived',
         updated_by = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND ($3::uuid[] IS NULL OR scope_account_ids && $3::uuid[])
     RETURNING id, name, description, filters, source_count, scope_account_ids,
               status, created_at, updated_at, created_by`,
    [audienceId, userId ?? null, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );

  return result.rows[0] ? mapSavedAudienceRow(result.rows[0]) : null;
}

export async function listCampaignRuns(
  limit = 20,
  requesterScopeAccountIds?: string[]
): Promise<CampaignRun[]> {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<CampaignRunRow>(
    `SELECT id, provider, provider_campaign_id, title, list_id, include_audience_id,
            exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
            requested_send_time, status, counts, scope_account_ids, failure_message,
            requested_by, created_at, updated_at
     FROM campaign_runs
     WHERE ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])
     ORDER BY updated_at DESC
     LIMIT $1`,
    [Math.min(Math.max(limit, 1), 100), scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );

  return result.rows.map(mapCampaignRunRow);
}

function buildCampaignRunAudienceSnapshot(
  request: CreateCampaignRequest,
  targeting?: PreparedCampaignTargeting
): Record<string, unknown> {
  return {
    listId: request.listId,
    segmentId: request.segmentId ?? null,
    includeAudienceId: request.includeAudienceId ?? null,
    exclusionAudienceIds: request.exclusionAudienceIds ?? [],
    priorRunSuppressionIds: request.priorRunSuppressionIds ?? [],
    ...(request.audienceSnapshot ?? {}),
    ...(targeting?.audienceSnapshot ?? {}),
  };
}

async function createPendingCampaignRun(
  request: CreateCampaignRequest
): Promise<CampaignRun> {
  const result = await pool.query<CampaignRunRow>(
    `INSERT INTO campaign_runs (
       title,
       list_id,
       include_audience_id,
       exclusion_audience_ids,
       suppression_snapshot,
       test_recipients,
       audience_snapshot,
       requested_send_time,
       status,
       counts,
       scope_account_ids,
       requested_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', '{}'::jsonb, $9, $10)
     RETURNING id, provider, provider_campaign_id, title, list_id, include_audience_id,
               exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
               requested_send_time, status, counts, scope_account_ids, failure_message,
               requested_by, created_at, updated_at`,
    [
      request.title,
      request.listId,
      request.includeAudienceId || null,
      request.exclusionAudienceIds ?? [],
      JSON.stringify(request.suppressionSnapshot ?? []),
      request.testRecipients ?? [],
      JSON.stringify(buildCampaignRunAudienceSnapshot(request)),
      request.sendTime ?? null,
      uniqueStrings(request.scopeAccountIds ?? []),
      request.requestedBy ?? null,
    ]
  );

  return mapCampaignRunRow(result.rows[0]);
}

async function getCampaignRunsByIds(
  runIds: string[],
  requesterScopeAccountIds?: string[]
): Promise<CampaignRun[]> {
  if (runIds.length === 0) {
    return [];
  }

  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<CampaignRunRow>(
    `SELECT id, provider, provider_campaign_id, title, list_id, include_audience_id,
            exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
            requested_send_time, status, counts, scope_account_ids, failure_message,
            requested_by, created_at, updated_at
     FROM campaign_runs
     WHERE provider = 'mailchimp'
       AND id = ANY($1::uuid[])
       AND ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])`,
    [runIds, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );

  return result.rows.map(mapCampaignRunRow);
}

async function finalizeCampaignRun(
  runId: string,
  request: CreateCampaignRequest,
  providerCampaignId: string,
  status: CampaignRunStatus,
  targeting?: PreparedCampaignTargeting
): Promise<CampaignRun> {
  const result = await pool.query<CampaignRunRow>(
    `UPDATE campaign_runs
     SET provider_campaign_id = $2,
         title = $3,
         list_id = $4,
         include_audience_id = $5,
         exclusion_audience_ids = $6,
         suppression_snapshot = $7,
         test_recipients = $8,
         audience_snapshot = $9,
         requested_send_time = $10,
         status = $11,
         counts = $12,
         scope_account_ids = $13,
         requested_by = $14,
         failure_message = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, provider, provider_campaign_id, title, list_id, include_audience_id,
               exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
               requested_send_time, status, counts, scope_account_ids, failure_message,
               requested_by, created_at, updated_at`,
    [
      runId,
      providerCampaignId,
      request.title,
      request.listId,
      request.includeAudienceId || null,
      request.exclusionAudienceIds ?? [],
      JSON.stringify(targeting?.suppressionSnapshot ?? request.suppressionSnapshot ?? []),
      request.testRecipients ?? [],
      JSON.stringify(buildCampaignRunAudienceSnapshot(request, targeting)),
      request.sendTime ?? null,
      status,
      JSON.stringify(targeting?.counts ?? {}),
      uniqueStrings([...(request.scopeAccountIds ?? []), ...(targeting?.scopeAccountIds ?? [])]),
      request.requestedBy ?? null,
    ]
  );

  return mapCampaignRunRow(result.rows[0]);
}

async function markCampaignRunFailed(runId: string, message: string): Promise<void> {
  await pool.query(
    `UPDATE campaign_runs
     SET status = 'failed',
         failure_message = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [runId, message]
  );
}

async function prepareSavedAudienceTargeting(
  request: CreateCampaignRequest,
  runId: string
): Promise<PreparedCampaignTargeting | null> {
  if (!request.includeAudienceId) {
    if (
      (request.exclusionAudienceIds ?? []).length > 0 ||
      (request.priorRunSuppressionIds ?? []).length > 0
    ) {
      return throwCampaignTargetingValidation(
        'Suppressions require a saved audience target'
      );
    }
    return null;
  }

  if (request.segmentId) {
    return throwCampaignTargetingValidation(
      'Choose either a provider segment or a saved audience, not both'
    );
  }

  const exclusionAudienceIds = request.exclusionAudienceIds ?? [];
  const priorRunSuppressionIds = uniqueStrings(request.priorRunSuppressionIds ?? []);
  assertUuidList(priorRunSuppressionIds, 'priorRunSuppressionIds');

  if (exclusionAudienceIds.includes(request.includeAudienceId)) {
    return throwCampaignTargetingValidation('A saved audience cannot suppress itself');
  }

  const includeAudience = await getSavedAudience(request.includeAudienceId);
  if (!includeAudience || includeAudience.status !== 'active') {
    return throwCampaignTargetingValidation('Saved audience target was not found or is archived');
  }

  const includeFilters = resolveSavedAudienceFilters(includeAudience, request.listId);
  await validateSelectedContactFilters(includeFilters, request.scopeAccountIds);

  const suppressionAudiences = await Promise.all(exclusionAudienceIds.map(getSavedAudience));
  const suppressionContactIds = new Set<string>();
  const scopeAccountIds = new Set(includeAudience.scopeAccountIds);
  const suppressionSnapshot = [];

  for (const audience of suppressionAudiences) {
    if (!audience || audience.status !== 'active') {
      return throwCampaignTargetingValidation(
        'Suppression saved audience was not found or is archived'
      );
    }
    const filters = resolveSavedAudienceFilters(audience, request.listId);
    await validateSelectedContactFilters(filters, request.scopeAccountIds);
    filters.contactIds.forEach((contactId) => suppressionContactIds.add(contactId));
    audience.scopeAccountIds.forEach((accountId) => scopeAccountIds.add(accountId));
    suppressionSnapshot.push({
      type: 'saved_audience',
      id: audience.id,
      name: audience.name,
      sourceCount: audience.sourceCount,
    });
  }

  const priorRuns = await getCampaignRunsByIds(priorRunSuppressionIds, request.scopeAccountIds);
  if (priorRuns.length !== priorRunSuppressionIds.length) {
    return throwCampaignTargetingValidation('Prior campaign run suppression was not found');
  }

  for (const run of priorRuns) {
    if (run.listId !== request.listId) {
      return throwCampaignTargetingValidation(
        'Prior campaign run suppression belongs to a different Mailchimp audience'
      );
    }

    const targetContactIds = getStringArray(run.audienceSnapshot.targetContactIds);
    if (targetContactIds.length === 0) {
      return throwCampaignTargetingValidation(
        'Prior campaign run suppression is missing a target contact snapshot'
      );
    }

    targetContactIds.forEach((contactId) => suppressionContactIds.add(contactId));
    run.scopeAccountIds.forEach((accountId) => scopeAccountIds.add(accountId));
    suppressionSnapshot.push({
      type: 'prior_campaign_run',
      id: run.id,
      title: run.title,
      providerCampaignId: run.providerCampaignId,
      targetContactCount: targetContactIds.length,
    });
  }

  const requestedContactIds = includeFilters.contactIds.filter(
    (contactId) => !suppressionContactIds.has(contactId)
  );
  if (requestedContactIds.length === 0) {
    return throwCampaignTargetingValidation(
      'Saved audience targeting has no contacts after suppressions'
    );
  }

  const syncResult = await bulkSyncContacts({
    contactIds: requestedContactIds,
    listId: request.listId,
  });
  const syncedEmails = syncResult.results
    .filter((result) => result.success && result.email)
    .map((result) => result.email);

  if (syncedEmails.length === 0) {
    return throwCampaignTargetingValidation(
      'Saved audience targeting has no deliverable Mailchimp members'
    );
  }

  const segmentName = `NPM ${new Date().toISOString()} ${runId.slice(0, 8)} ${request.title}`.slice(0, 100);
  const segment = await mailchimpClient.lists.createSegment(request.listId, {
    name: segmentName,
    static_segment: [],
  });
  const providerSegmentId = Number(segment.id);

  await mailchimpClient.lists.batchSegmentMembers(
    {
      members_to_add: syncedEmails,
      members_to_remove: [],
    },
    request.listId,
    providerSegmentId
  );

  return {
    providerSegmentId,
    scopeAccountIds: Array.from(scopeAccountIds),
    suppressionSnapshot,
    counts: {
      includeSourceCount: includeAudience.sourceCount,
      suppressionSourceCount: suppressionContactIds.size,
      priorRunSuppressionCount: priorRuns.length,
      requestedContactCount: requestedContactIds.length,
      targetContactCount: requestedContactIds.length,
      syncedContactCount: syncedEmails.length,
      skippedContactCount: syncResult.skipped + syncResult.errors,
      providerSegmentMemberCount: syncedEmails.length,
    },
    audienceSnapshot: {
      targetingMode: 'saved_audience_static_segment',
      savedAudienceId: includeAudience.id,
      savedAudienceName: includeAudience.name,
      providerSegmentId,
      providerSegmentName: segment.name ?? segmentName,
      suppressionAudiences: suppressionSnapshot,
      targetContactIds: requestedContactIds,
      priorRunSuppressionIds,
      mailchimpListId: request.listId,
    },
  };
}

function resolveCampaignWebhookStatus(payload: MailchimpWebhookPayload): CampaignRunStatus | null {
  const lifecycleValue = String(payload.data?.status ?? payload.data?.action ?? '').toLowerCase();
  if (['sent', 'send'].includes(lifecycleValue)) return 'sent';
  if (['sending', 'started', 'start'].includes(lifecycleValue)) return 'sending';
  if (['canceled', 'cancelled', 'cancel'].includes(lifecycleValue)) return 'canceled';
  if (['failed', 'error'].includes(lifecycleValue)) return 'failed';
  if (['scheduled', 'schedule'].includes(lifecycleValue)) return 'scheduled';
  return null;
}

export async function recordCampaignLifecycleWebhook(
  payload: MailchimpWebhookPayload
): Promise<boolean> {
  if (payload.type !== 'campaign') {
    return false;
  }

  const providerCampaignId = payload.data?.campaignId ?? payload.data?.id;
  if (!providerCampaignId) {
    return false;
  }

  const nextStatus = resolveCampaignWebhookStatus(payload);
  const lifecycleSummary = {
    lastWebhookType: payload.type,
    lastWebhookAction: payload.data?.action ?? null,
    lastWebhookStatus: payload.data?.status ?? null,
    lastWebhookAt: payload.firedAt instanceof Date ? payload.firedAt.toISOString() : new Date().toISOString(),
  };

  const result = await pool.query(
    `UPDATE campaign_runs
     SET status = COALESCE($2::varchar, status),
         counts = jsonb_set(COALESCE(counts, '{}'::jsonb), '{providerLifecycle}', $3::jsonb, true),
         updated_at = CURRENT_TIMESTAMP
     WHERE provider = 'mailchimp'
       AND provider_campaign_id = $1`,
    [providerCampaignId, nextStatus, JSON.stringify(lifecycleSummary)]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Check if Mailchimp is configured
 */
export function isMailchimpConfigured(): boolean {
  return getMailchimpConfigured();
}

/**
 * Get Mailchimp account status and basic info
 */
export async function getStatus(): Promise<MailchimpStatus> {
  if (!getMailchimpConfigured()) {
    return { configured: false };
  }

  try {
    const response = await mailchimpClient.ping.get();

    if (response.health_status === "Everything's Chimpy!") {
      // Get account info
      const accountInfo = await mailchimpClient.root.getRoot();
      const lists = await mailchimpClient.lists.getAllLists({ count: 0 });

      return {
        configured: true,
        accountName: accountInfo.account_name,
        listCount: lists.total_items,
      };
    }

    return { configured: false };
  } catch (error) {
    logger.error('Failed to get Mailchimp status', { error });
    return { configured: false };
  }
}

/**
 * Get all Mailchimp audiences/lists
 */
export async function getLists(): Promise<MailchimpList[]> {
  if (warnIfMailchimpNotConfigured('Mailchimp getLists called but not configured')) {
    return [];
  }

  try {
    const response = await mailchimpClient.lists.getAllLists({
      count: 100,
      fields: [
        'lists.id',
        'lists.name',
        'lists.stats.member_count',
        'lists.date_created',
        'lists.double_optin',
      ],
    });

    return response.lists.map(mapMailchimpList);
  } catch (error) {
    logger.error('Failed to get Mailchimp lists', { error });
    throw error;
  }
}

/**
 * Get a specific list by ID
 */
export async function getList(listId: string): Promise<MailchimpList> {
  assertMailchimpConfigured('Mailchimp is not configured. Please check your API settings.');

  try {
    const list = await mailchimpClient.lists.getList(listId);
    return mapMailchimpList(list);
  } catch (error) {
    logger.error('Failed to get Mailchimp list', { error, listId });
    throw error;
  }
}

/**
 * Add or update a member in a Mailchimp list
 */
export async function addOrUpdateMember(request: AddMemberRequest): Promise<MailchimpMember> {
  assertMailchimpConfigured('Mailchimp is not configured. Member cannot be added.');

  const subscriberHash = getSubscriberHash(request.email);

  try {
    const response = await mailchimpClient.lists.setListMember(
      request.listId,
      subscriberHash,
      buildMemberUpsertPayload(request)
    );

    if (request.tags && request.tags.length > 0) {
      await mailchimpClient.lists.updateListMemberTags(request.listId, subscriberHash, {
        tags: buildActiveTagUpdates(request.tags),
      });
    }

    logger.info('Member added/updated in Mailchimp', {
      listId: request.listId,
      email: request.email,
    });

    return mapMailchimpMember(response);
  } catch (error) {
    logger.error('Failed to add/update Mailchimp member', { error, request });
    throw error;
  }
}

/**
 * Get a member from a Mailchimp list
 */
export async function getMember(listId: string, email: string): Promise<MailchimpMember | null> {
  if (!getMailchimpConfigured()) {
    return null;
  }

  const subscriberHash = getSubscriberHash(email);

  try {
    const response = await mailchimpClient.lists.getListMember(listId, subscriberHash);

    return mapMailchimpMember(response);
  } catch (error: unknown) {
    if (isMailchimpNotFoundError(error)) {
      return null;
    }
    logger.error('Failed to get Mailchimp member', { error, listId, email });
    throw error;
  }
}

/**
 * Delete a member from a Mailchimp list
 */
export async function deleteMember(listId: string, email: string): Promise<void> {
  if (warnIfMailchimpNotConfigured('Mailchimp deleteMember called but not configured')) {
    return;
  }

  const subscriberHash = getSubscriberHash(email);

  try {
    await mailchimpClient.lists.deleteListMemberPermanent(listId, subscriberHash);
    logger.info('Member deleted from Mailchimp', { listId, email });
  } catch (error) {
    logger.error('Failed to delete Mailchimp member', { error, listId, email });
    throw error;
  }
}

/**
 * Sync a single contact to Mailchimp
 */
export async function syncContact(request: SyncContactRequest): Promise<SyncResult> {
  if (!getMailchimpConfigured()) {
    return createSkippedSyncResult(request.contactId, 'Mailchimp is not configured');
  }

  try {
    const result = await pool.query(CONTACT_SELECT_QUERY, [request.contactId]);

    if (result.rows.length === 0) {
      return createSkippedSyncResult(request.contactId, 'Contact not found');
    }

    const contact = result.rows[0] as MailchimpContactRow;

    if (!contact.email) {
      return createSkippedSyncResult(request.contactId, 'Contact has no email address');
    }

    if (contact.do_not_email) {
      return createSkippedSyncResult(
        request.contactId,
        'Contact has do_not_email flag set',
        contact.email
      );
    }

    const existingMember = await getMember(request.listId, contact.email);
    const action = existingMember ? 'updated' : 'added';

    await addOrUpdateMember({
      listId: request.listId,
      email: contact.email,
      status: 'subscribed',
      mergeFields: buildContactMergeFields(contact),
      tags: request.tags,
    });

    logger.info('Contact synced to Mailchimp', {
      contactId: request.contactId,
      email: contact.email,
      listId: request.listId,
      action,
    });

    return {
      contactId: request.contactId,
      email: contact.email,
      success: true,
      action,
    };
  } catch (error) {
    logger.error('Failed to sync contact to Mailchimp', { error, request });
    if (isMailchimpNotFoundError(error)) {
      return createSkippedSyncResult(request.contactId, 'Mailchimp list not found', '', 404);
    }
    return createSkippedSyncResult(
      request.contactId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Bulk sync contacts to Mailchimp
 * Uses Promise.all for parallel syncing instead of sequential operations
 */
export async function bulkSyncContacts(request: BulkSyncRequest): Promise<BulkSyncResponse> {
  if (!getMailchimpConfigured()) {
    return {
      total: request.contactIds.length,
      added: 0,
      updated: 0,
      skipped: request.contactIds.length,
      errors: 0,
      results: request.contactIds.map((id) =>
        createSkippedSyncResult(id, 'Mailchimp is not configured')
      ),
    };
  }

  const syncPromises = request.contactIds.map((contactId) =>
    syncContact({
      contactId,
      listId: request.listId,
      tags: request.tags,
    })
  );

  const results = await Promise.all(syncPromises);

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    if (result.success) {
      if (result.action === 'added') added++;
      else if (result.action === 'updated') updated++;
    } else if (result.error) {
      if (result.action === 'skipped') skipped++;
      else errors++;
    }
  }

  logger.info('Bulk sync completed', {
    total: request.contactIds.length,
    added,
    updated,
    skipped,
    errors,
  });

  return {
    total: request.contactIds.length,
    added,
    updated,
    skipped,
    errors,
    results,
  };
}

/**
 * Update tags for a member
 */
export async function updateMemberTags(request: UpdateTagsRequest): Promise<void> {
  if (warnIfMailchimpNotConfigured('Mailchimp updateMemberTags called but not configured')) {
    return;
  }

  const subscriberHash = getSubscriberHash(request.email);

  try {
    const tags = buildTagUpdates(request);

    if (tags.length > 0) {
      await mailchimpClient.lists.updateListMemberTags(request.listId, subscriberHash, { tags });
    }

    logger.info('Member tags updated', { listId: request.listId, email: request.email });
  } catch (error) {
    logger.error('Failed to update member tags', { error, request });
    throw error;
  }
}

/**
 * Get all tags for a list
 */
export async function getListTags(listId: string): Promise<MailchimpTag[]> {
  if (!getMailchimpConfigured()) {
    return [];
  }

  try {
    const response = await mailchimpClient.lists.listSegments(listId, {
      type: 'static',
      count: 100,
    });

    return response.segments.map(mapMailchimpTag);
  } catch (error) {
    logger.error('Failed to get list tags', { error, listId });
    throw error;
  }
}

/**
 * Get campaigns
 */
export async function getCampaigns(listId?: string): Promise<MailchimpCampaign[]> {
  if (!getMailchimpConfigured()) {
    return [];
  }

  try {
    const options: { count: number; list_id?: string } = { count: 50 };
    if (listId) {
      options.list_id = listId;
    }

    const response = await mailchimpClient.campaigns.list(options);

    return response.campaigns.map(mapMailchimpCampaign);
  } catch (error) {
    logger.error('Failed to get campaigns', { error, listId });
    throw error;
  }
}

/**
 * Create a segment in a list
 */
export async function createSegment(request: CreateSegmentRequest): Promise<MailchimpSegment> {
  assertMailchimpConfigured('Mailchimp is not configured. Segment cannot be created.');

  try {
    const response = await mailchimpClient.lists.createSegment(
      request.listId,
      buildSegmentPayload(request)
    );

    logger.info('Segment created', { listId: request.listId, segmentId: response.id });

    return mapMailchimpSegment(response);
  } catch (error) {
    logger.error('Failed to create segment', { error, request });
    throw error;
  }
}

/**
 * Get segments for a list
 */
export async function getSegments(listId: string): Promise<MailchimpSegment[]> {
  if (!getMailchimpConfigured()) {
    return [];
  }

  try {
    const response = await mailchimpClient.lists.listSegments(listId, {
      count: 100,
    });

    return response.segments.map(mapMailchimpSegment);
  } catch (error) {
    logger.error('Failed to get segments', { error, listId });
    throw error;
  }
}

/**
 * Create a new email campaign
 */
export async function createCampaign(request: CreateCampaignRequest): Promise<MailchimpCampaign> {
  assertMailchimpConfigured('Mailchimp is not configured. Campaign cannot be created.');
  if (request.includeAudienceId && request.segmentId) {
    return throwCampaignTargetingValidation(
      'Choose either a provider segment or a saved audience, not both'
    );
  }
  if (!request.includeAudienceId && (request.exclusionAudienceIds ?? []).length > 0) {
    return throwCampaignTargetingValidation(
      'Suppression audiences require a saved audience target'
    );
  }
  if (!request.includeAudienceId && (request.priorRunSuppressionIds ?? []).length > 0) {
    return throwCampaignTargetingValidation(
      'Prior campaign run suppressions require a saved audience target'
    );
  }

  let pendingRun: CampaignRun | null = null;
  try {
    pendingRun = await createPendingCampaignRun(request);
    const targeting = await prepareSavedAudienceTargeting(request, pendingRun.id);
    const campaignRequest = targeting?.providerSegmentId
      ? {
          ...request,
          segmentId: targeting.providerSegmentId,
          suppressionSnapshot: targeting.suppressionSnapshot,
        }
      : request;
    const resolvedContent = resolveMailchimpCampaignContent(request);
    const campaign = await mailchimpClient.campaigns.create(
      buildCampaignCreatePayload(campaignRequest)
    );

    await mailchimpClient.campaigns.setContent(
      campaign.id,
      buildCampaignContentPayload(resolvedContent)
    );

    if (request.sendTime) {
      await mailchimpClient.campaigns.schedule(
        campaign.id,
        buildCampaignSchedulePayload(request.sendTime)
      );
    }

    await finalizeCampaignRun(
      pendingRun.id,
      request,
      campaign.id,
      request.sendTime ? 'scheduled' : 'draft',
      targeting ?? undefined
    );

    logger.info('Campaign created', { campaignId: campaign.id, title: request.title });

    return {
      id: campaign.id,
      type: 'regular',
      status: request.sendTime ? 'schedule' : 'save',
      title: request.title,
      subject: request.subject,
      listId: request.listId,
      createdAt: new Date(campaign.create_time),
      sendTime: request.sendTime,
    };
  } catch (error) {
    if (pendingRun) {
      await markCampaignRunFailed(
        pendingRun.id,
        error instanceof Error ? error.message : 'Campaign creation failed'
      );
    }
    logger.error('Failed to create campaign', { error, request });
    throw error;
  }
}

/**
 * Send a campaign immediately
 */
export async function sendCampaign(campaignId: string): Promise<void> {
  assertMailchimpConfigured('Mailchimp is not configured. Campaign cannot be sent.');

  try {
    await mailchimpClient.campaigns.send(campaignId);
    await pool.query(
      `UPDATE campaign_runs
       SET status = 'sent',
           updated_at = CURRENT_TIMESTAMP
       WHERE provider = 'mailchimp'
         AND provider_campaign_id = $1`,
      [campaignId]
    );
    logger.info('Campaign sent', { campaignId });
  } catch (error) {
    await pool.query(
      `UPDATE campaign_runs
       SET status = 'failed',
           failure_message = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE provider = 'mailchimp'
         AND provider_campaign_id = $1`,
      [campaignId, error instanceof Error ? error.message : 'Campaign send failed']
    );
    logger.error('Failed to send campaign', { error, campaignId });
    throw error;
  }
}

export const mailchimpService = {
  isMailchimpConfigured,
  getStatus,
  getLists,
  getList,
  addOrUpdateMember,
  getMember,
  deleteMember,
  syncContact,
  bulkSyncContacts,
  updateMemberTags,
  getListTags,
  listSavedAudiences,
  createSavedAudience,
  archiveSavedAudience,
  getCampaigns,
  listCampaignRuns,
  createCampaign,
  sendCampaign,
  recordCampaignLifecycleWebhook,
  createSegment,
  getSegments,
};

export default mailchimpService;
