import pool from '@config/database';
import { logger } from '@config/logger';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendMail } from '@services/emailService';
import {
  renderMailchimpCampaignPreview,
  resolveMailchimpCampaignContent,
} from '@services/template/emailCampaignRenderer';
import mailchimpService from '@services/mailchimpService';
import {
  appendBrowserViewLink,
  appendUnsubscribeFooter,
  buildLocalCampaignBrowserViewUrl,
  buildLocalCampaignUnsubscribeUrl,
} from './localCampaignUnsubscribeHelpers';
import { retryFailedCampaignRunRecipients, unsupportedMailchimpRunAction } from './campaignRunActionService';
export { retryFailedCampaignRunRecipients } from './campaignRunActionService';
import type {
  CommunicationAudience,
  CommunicationAudiencePreview,
  CommunicationAudiencePreviewRequest,
  CommunicationCampaign,
  CommunicationCampaignActionResult,
  CommunicationCampaignRecipient,
  CommunicationCampaignRecipientList,
  CommunicationCampaignRescheduleRequest,
  CommunicationCampaignRun,
  CommunicationCampaignRunStatus,
  CommunicationRecipientStatus,
  CommunicationCampaignTestSendRequest,
  CommunicationCampaignTestSendResponse,
  CommunicationProvider,
  CommunicationProviderAudience,
  CommunicationProviderStatus,
  CreateCommunicationAudienceRequest,
  CreateCommunicationCampaignRequest,
  MailchimpCompatibleCampaignRequest,
} from '@app-types/communications';
import type { MailchimpCampaign } from '@app-types/mailchimp';

interface SavedAudienceRow {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown>;
  source_count: number;
  scope_account_ids: string[] | null;
  status: CommunicationAudience['status'];
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
}

interface CampaignRunRow {
  id: string;
  provider: CommunicationProvider;
  provider_campaign_id: string | null;
  title: string;
  list_id: string | null;
  include_audience_id: string | null;
  exclusion_audience_ids: string[];
  suppression_snapshot: unknown[];
  test_recipients: string[];
  audience_snapshot: Record<string, unknown>;
  content_snapshot: Record<string, unknown> | null;
  requested_send_time: Date | null;
  status: CommunicationCampaignRunStatus;
  counts: Record<string, unknown>;
  scope_account_ids: string[] | null;
  failure_message: string | null;
  requested_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ContactRecipientRow {
  id: string;
  account_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  do_not_email: boolean | null;
  suppressed: boolean | null;
}

interface CampaignRunRecipientRow {
  id: string;
  campaign_run_id: string;
  contact_id: string | null;
  email: string;
  status: CommunicationRecipientStatus;
  contact_name: string | null;
  failure_message: string | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface DeliveryCounts {
  requestedContactCount: number;
  queuedRecipientCount: number;
  suppressedRecipientCount: number;
  missingEmailCount: number;
  doNotEmailCount: number;
}

const LOCAL_BATCH_LIMIT = 50;
const LOCAL_AUDIENCE_ID = 'local_email:crm';
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class CommunicationsValidationError extends Error {
  statusCode = 400;
}
const uniqueStrings = (values: readonly string[] = []): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
const assertUuidList = (values: readonly string[], label: string): void => {
  const invalid = values.find((value) => !uuidPattern.test(value));
  if (invalid) {
    throw new CommunicationsValidationError(`${label} must contain only UUID values`);
  }
};

const mapAudienceRow = (row: SavedAudienceRow): CommunicationAudience => ({
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

const mapRunRow = (row: CampaignRunRow): CommunicationCampaignRun => ({
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
  contentSnapshot: row.content_snapshot ?? {},
  requestedSendTime: row.requested_send_time,
  status: row.status,
  counts: row.counts ?? {},
  scopeAccountIds: row.scope_account_ids ?? [],
  failureMessage: row.failure_message,
  requestedBy: row.requested_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRecipientRow = (row: CampaignRunRecipientRow): CommunicationCampaignRecipient => ({
  id: row.id, campaignRunId: row.campaign_run_id, contactId: row.contact_id, email: row.email,
  status: row.status, contactName: row.contact_name, failureMessage: row.failure_message,
  sentAt: row.sent_at, createdAt: row.created_at, updatedAt: row.updated_at,
});

const asMailchimpRequest = (
  request: CreateCommunicationCampaignRequest
): MailchimpCompatibleCampaignRequest => ({
  listId: request.listId ?? '',
  title: request.title,
  subject: request.subject,
  previewText: request.previewText,
  fromName: request.fromName,
  replyTo: request.replyTo,
  htmlContent: request.htmlContent,
  plainTextContent: request.plainTextContent,
  builderContent: request.builderContent,
  segmentId: request.segmentId,
  sendTime: request.sendTime,
  includeAudienceId: request.includeAudienceId,
  exclusionAudienceIds: request.exclusionAudienceIds,
  priorRunSuppressionIds: request.priorRunSuppressionIds,
  suppressionSnapshot: request.suppressionSnapshot,
  testRecipients: request.testRecipients,
  audienceSnapshot: request.audienceSnapshot,
  requestedBy: request.requestedBy,
  scopeAccountIds: request.scopeAccountIds,
});

const getContactIdsFromFilters = (filters: Record<string, unknown>): string[] => {
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

const loadSavedAudience = async (audienceId: string): Promise<CommunicationAudience | null> => {
  const result = await pool.query<SavedAudienceRow>(
    `SELECT id, name, description, filters, source_count, scope_account_ids,
            status, created_at, updated_at, created_by
       FROM saved_audiences
      WHERE id = $1`,
    [audienceId]
  );
  return result.rows[0] ? mapAudienceRow(result.rows[0]) : null;
};

const getPriorRunTargetContactIds = async (
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

const getExclusionContactIds = async (
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

const resolveRequestedContactIds = async (
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

const loadEligibleContacts = async (
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

export const getStatus = async (): Promise<CommunicationProviderStatus> => {
  const [emailSettings, mailchimp] = await Promise.all([
    getEmailSettings(),
    mailchimpService.getStatus(),
  ]);
  const localConfigured = Boolean(emailSettings?.isConfigured);

  return {
    configured: localConfigured,
    provider: 'local_email',
    localEmail: {
      provider: 'local_email',
      configured: localConfigured,
      ready: localConfigured,
      fromAddress: emailSettings?.smtpFromAddress ?? null,
      fromName: emailSettings?.smtpFromName ?? null,
      lastTestedAt: emailSettings?.lastTestedAt ?? null,
      lastTestSuccess: emailSettings?.lastTestSuccess ?? null,
    },
    mailchimp,
    providers: {
      local_email: {
        provider: 'local_email',
        configured: localConfigured,
        ready: localConfigured,
        fromAddress: emailSettings?.smtpFromAddress ?? null,
        fromName: emailSettings?.smtpFromName ?? null,
      },
      mailchimp: {
        provider: 'mailchimp',
        configured: Boolean(mailchimp.configured),
        accountName: mailchimp.accountName,
        audienceCount: mailchimp.listCount,
      },
    },
    defaultProvider: 'local_email',
  };
};

const getLocalAudience = async (
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

const isLocalAudienceId = (audienceId?: string | null): boolean =>
  !audienceId || audienceId === LOCAL_AUDIENCE_ID || audienceId === 'local_email';

const loadLocalAudienceContactIds = async (
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

export const listProviderAudiences = async (
  requesterScopeAccountIds?: string[]
): Promise<CommunicationProviderAudience[]> => {
  const localAudience = await getLocalAudience(requesterScopeAccountIds);
  try {
    const mailchimpLists = await mailchimpService.getLists();
    return [
      localAudience,
      ...mailchimpLists.map((list) => ({
        ...list,
        provider: 'mailchimp' as const,
      })),
    ];
  } catch (error) {
    logger.warn('Failed to load optional Mailchimp provider audiences', { error });
    return [localAudience];
  }
};

export const getProviderAudience = async (
  audienceId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationProviderAudience | null> => {
  if (isLocalAudienceId(audienceId)) {
    return getLocalAudience(requesterScopeAccountIds);
  }
  const audiences = await listProviderAudiences(requesterScopeAccountIds);
  return audiences.find((audience) => audience.id === audienceId) ?? null;
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

const mapLocalRunToCampaign = (run: CommunicationCampaignRun): CommunicationCampaign => {
  const subject = typeof run.contentSnapshot.subject === 'string' ? run.contentSnapshot.subject : undefined;
  const sentCount =
    typeof run.counts.sentRecipientCount === 'number'
      ? run.counts.sentRecipientCount
      : typeof run.counts.emailsSent === 'number'
        ? run.counts.emailsSent
        : undefined;

  return {
    id: run.providerCampaignId ?? run.id,
    provider: run.provider,
    campaignRunId: run.id,
    providerCampaignId: run.providerCampaignId,
    type: 'regular',
    status: run.status,
    title: run.title,
    subject,
    listId: run.listId ?? LOCAL_AUDIENCE_ID,
    createdAt: run.createdAt,
    sendTime: run.requestedSendTime,
    emailsSent: sentCount,
  };
};

const mapMailchimpCampaign = (
  campaign: MailchimpCampaign,
  campaignRunId?: string
): CommunicationCampaign => ({
  ...campaign,
  provider: 'mailchimp',
  campaignRunId,
  providerCampaignId: campaign.id,
});

const findMailchimpRunIds = async (
  providerCampaignIds: readonly string[],
  requesterScopeAccountIds?: string[]
): Promise<Map<string, string>> => {
  const campaignIds = uniqueStrings(providerCampaignIds);
  if (campaignIds.length === 0) {
    return new Map();
  }
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<{ id: string; provider_campaign_id: string }>(
    `SELECT id, provider_campaign_id
       FROM campaign_runs
      WHERE provider = 'mailchimp'
        AND provider_campaign_id = ANY($1::text[])
        AND ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])`,
    [campaignIds, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return new Map(result.rows.map((row) => [row.provider_campaign_id, row.id]));
};

export const listCampaigns = async (
  audienceId?: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaign[]> => {
  const campaigns: CommunicationCampaign[] = [];
  const shouldIncludeLocal = isLocalAudienceId(audienceId);

  if (shouldIncludeLocal) {
    campaigns.push(
      ...(await listCampaignRuns(20, requesterScopeAccountIds))
        .filter((run) => run.provider === 'local_email')
        .map(mapLocalRunToCampaign)
    );
  }

  if (audienceId && isLocalAudienceId(audienceId)) {
    return campaigns;
  }

  try {
    const mailchimpCampaigns = await mailchimpService.getCampaigns(audienceId);
    const runIds = await findMailchimpRunIds(
      mailchimpCampaigns.map((campaign) => campaign.id),
      requesterScopeAccountIds
    );
    campaigns.push(
      ...mailchimpCampaigns.map((campaign) => mapMailchimpCampaign(campaign, runIds.get(campaign.id)))
    );
  } catch (error) {
    logger.warn('Failed to load optional Mailchimp campaigns', { error, audienceId });
  }
  return campaigns;
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

export const previewCampaign = (
  request: CreateCommunicationCampaignRequest
) => renderMailchimpCampaignPreview(asMailchimpRequest(request));

const buildContentSnapshot = (request: CreateCommunicationCampaignRequest): Record<string, unknown> => {
  const content = resolveMailchimpCampaignContent(asMailchimpRequest(request));
  return {
    subject: request.subject,
    previewText: request.previewText ?? null,
    fromName: request.fromName,
    replyTo: request.replyTo,
    html: content.html,
    plainText: content.plainText,
    warnings: content.warnings,
  };
};

const insertLocalRecipients = async (
  runId: string,
  contacts: ContactRecipientRow[]
): Promise<DeliveryCounts> => {
  let queuedRecipientCount = 0;
  let suppressedRecipientCount = 0;
  let missingEmailCount = 0;
  let doNotEmailCount = 0;

  for (const contact of contacts) {
    const email = contact.email?.trim().toLowerCase() ?? '';
    let status: 'queued' | 'suppressed' = 'queued';
    let failureMessage: string | null = null;

    if (!email) {
      status = 'suppressed';
      failureMessage = 'Contact has no email address';
      missingEmailCount++;
    } else if (contact.do_not_email) {
      status = 'suppressed';
      failureMessage = 'Contact has do_not_email flag set';
      doNotEmailCount++;
    } else if (contact.suppressed) {
      status = 'suppressed';
      failureMessage = 'Contact has active email suppression evidence';
      suppressedRecipientCount++;
    } else {
      queuedRecipientCount++;
    }

    await pool.query(
      `INSERT INTO campaign_run_recipients (
         campaign_run_id, contact_id, email, status, failure_message
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (campaign_run_id, contact_id, email) DO UPDATE
         SET status = EXCLUDED.status,
             failure_message = EXCLUDED.failure_message,
             updated_at = CURRENT_TIMESTAMP`,
      [runId, contact.id, email || `contact:${contact.id}`, status, failureMessage]
    );
  }

  return {
    requestedContactCount: contacts.length,
    queuedRecipientCount,
    suppressedRecipientCount,
    missingEmailCount,
    doNotEmailCount,
  };
};

export const createCampaign = async (
  request: CreateCommunicationCampaignRequest
): Promise<CommunicationCampaign> => {
  const provider = request.provider ?? 'local_email';
  if (provider === 'mailchimp') {
    if (!request.listId) {
      throw new CommunicationsValidationError('Mailchimp campaigns require a provider audience');
    }
    const campaign = await mailchimpService.createCampaign(asMailchimpRequest(request));
    const runIds = await findMailchimpRunIds([campaign.id], request.scopeAccountIds);
    return mapMailchimpCampaign(campaign, runIds.get(campaign.id));
  }

  if (!isLocalAudienceId(request.listId)) {
    throw new CommunicationsValidationError('Local email campaigns require the local CRM audience');
  }

  const hasExplicitAudience = Boolean(request.contactIds?.length || request.includeAudienceId);
  const contactIds = hasExplicitAudience
    ? await resolveRequestedContactIds(
        {
          contactIds: request.contactIds,
          includeAudienceId: request.includeAudienceId,
          exclusionAudienceIds: request.exclusionAudienceIds,
          priorRunSuppressionIds: request.priorRunSuppressionIds,
        },
        request.scopeAccountIds
      )
    : await loadLocalAudienceContactIds(request.scopeAccountIds);
  if (contactIds.length === 0) {
    throw new CommunicationsValidationError('Local CRM audience has no eligible contacts');
  }
  const contacts = await loadEligibleContacts(contactIds, request.scopeAccountIds);
  const preview = await previewAudience(
    { contactIds, includeAudienceId: request.includeAudienceId },
    request.scopeAccountIds
  );
  const contentSnapshot = buildContentSnapshot(request);

  const result = await pool.query<CampaignRunRow>(
    `INSERT INTO campaign_runs (
       provider,
       title,
       list_id,
       include_audience_id,
       exclusion_audience_ids,
       suppression_snapshot,
       test_recipients,
       audience_snapshot,
       content_snapshot,
       requested_send_time,
       status,
       counts,
       scope_account_ids,
       requested_by
     )
     VALUES (
       'local_email', $1, $2, $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13
     )
     RETURNING id, provider, provider_campaign_id, title, list_id, include_audience_id,
               exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
               content_snapshot, requested_send_time, status, counts, scope_account_ids,
               failure_message, requested_by, created_at, updated_at`,
    [
      request.title,
      request.listId ?? LOCAL_AUDIENCE_ID,
      request.includeAudienceId ?? null,
      request.exclusionAudienceIds ?? [],
      JSON.stringify(request.suppressionSnapshot ?? []),
      request.testRecipients ?? [],
      JSON.stringify({
        ...(request.audienceSnapshot ?? {}),
        targetContactIds: preview.targetContactIds,
        suppressedContactIds: preview.suppressedContactIds,
        provider: 'local_email',
      }),
      JSON.stringify(contentSnapshot),
      request.sendTime ?? null,
      request.sendTime ? 'scheduled' : 'draft',
      JSON.stringify({
        requestedContactCount: preview.requestedContactCount,
        eligibleContactCount: preview.eligibleContactCount,
        missingEmailCount: preview.missingEmailCount,
        doNotEmailCount: preview.doNotEmailCount,
        suppressedCount: preview.suppressedCount,
      }),
      uniqueStrings(request.scopeAccountIds ?? []),
      request.requestedBy ?? null,
    ]
  );

  const run = mapRunRow(result.rows[0]);
  const deliveryCounts = await insertLocalRecipients(run.id, contacts);
  const updated = await updateRunCounts(run.id, { ...deliveryCounts });
  return mapLocalRunToCampaign(updated);
};

const updateRunCounts = async (
  runId: string,
  countsPatch: Record<string, unknown>,
  status?: CommunicationCampaignRunStatus,
  failureMessage?: string | null
): Promise<CommunicationCampaignRun> => {
  const result = await pool.query<CampaignRunRow>(
    `UPDATE campaign_runs
        SET counts = COALESCE(counts, '{}'::jsonb) || $2::jsonb,
            status = COALESCE($3, status),
            failure_message = $4,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, provider, provider_campaign_id, title, list_id, include_audience_id,
                exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
                content_snapshot, requested_send_time, status, counts, scope_account_ids,
                failure_message, requested_by, created_at, updated_at`,
    [runId, JSON.stringify(countsPatch), status ?? null, failureMessage ?? null]
  );
  if (!result.rows[0]) {
    throw new CommunicationsValidationError('Campaign run was not found');
  }
  return mapRunRow(result.rows[0]);
};

export const listCampaignRuns = async (
  limit = 20,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignRun[]> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<CampaignRunRow>(
    `SELECT id, provider, provider_campaign_id, title, list_id, include_audience_id,
            exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
            COALESCE(content_snapshot, '{}'::jsonb) AS content_snapshot,
            requested_send_time, status, counts, scope_account_ids, failure_message,
            requested_by, created_at, updated_at
       FROM campaign_runs
      WHERE ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])
      ORDER BY updated_at DESC
      LIMIT $1`,
    [Math.min(Math.max(limit, 1), 100), scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return result.rows.map(mapRunRow);
};

export const listCampaignRunRecipients = async (
  runId: string,
  options: { status?: CommunicationRecipientStatus; limit?: number } = {},
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignRecipientList | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  if (run.provider === 'mailchimp') {
    return {
      runId: run.id,
      status: options.status,
      limit,
      recipients: [],
    };
  }

  const result = await pool.query<CampaignRunRecipientRow>(
    `SELECT crr.id,
            crr.campaign_run_id,
            crr.contact_id,
            crr.email,
            crr.status,
            NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), '') AS contact_name,
            crr.failure_message,
            crr.sent_at,
            crr.created_at,
            crr.updated_at
       FROM campaign_run_recipients crr
       LEFT JOIN contacts c ON c.id = crr.contact_id
      WHERE crr.campaign_run_id = $1
        AND ($2::text IS NULL OR crr.status = $2)
      ORDER BY crr.created_at ASC, crr.id ASC
      LIMIT $3`,
    [run.id, options.status ?? null, limit]
  );

  return {
    runId: run.id,
    status: options.status,
    limit,
    recipients: result.rows.map(mapRecipientRow),
  };
};

const getCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignRun | null> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<CampaignRunRow>(
    `SELECT id, provider, provider_campaign_id, title, list_id, include_audience_id,
            exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
            COALESCE(content_snapshot, '{}'::jsonb) AS content_snapshot,
            requested_send_time, status, counts, scope_account_ids, failure_message,
            requested_by, created_at, updated_at
       FROM campaign_runs
      WHERE id = $1
        AND ($2::uuid[] IS NULL OR scope_account_ids && $2::uuid[])`,
    [runId, scopeAccountIds.length > 0 ? scopeAccountIds : null]
  );
  return result.rows[0] ? mapRunRow(result.rows[0]) : null;
};

export const sendCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return mailchimpService.sendCampaignRun(runId, requesterScopeAccountIds) as Promise<CommunicationCampaignActionResult | null>;
  }
  if (!['draft', 'scheduled', 'sending'].includes(run.status)) {
    throw new CommunicationsValidationError(`Campaign run cannot be sent from ${run.status} status`);
  }

  const content = run.contentSnapshot;
  const subject = typeof content.subject === 'string' ? content.subject : run.title;
  const html = typeof content.html === 'string' ? content.html : '';
  const plainText = typeof content.plainText === 'string' ? content.plainText : '';
  const recipients = await pool.query<{
    id: string;
    email: string;
  }>(
    `UPDATE campaign_run_recipients
        SET status = 'sending',
            updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT id
          FROM campaign_run_recipients
         WHERE campaign_run_id = $1
           AND status = 'queued'
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, email`,
    [run.id, LOCAL_BATCH_LIMIT]
  );

  if (recipients.rows.length === 0) {
    const statusCounts = await pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count
         FROM campaign_run_recipients
        WHERE campaign_run_id = $1
        GROUP BY status`,
      [run.id]
    );
    const countsByStatus = new Map(
      statusCounts.rows.map((row) => [row.status, Number(row.count ?? 0)])
    );
    const failedRecipientCount = countsByStatus.get('failed') ?? 0;
    const updated = await updateRunCounts(
      run.id,
      { failedRecipientCount },
      failedRecipientCount > 0 ? 'failed' : 'sent',
      failedRecipientCount > 0 ? 'One or more local email recipients failed' : null
    );
    return {
      run: updated,
      action: failedRecipientCount > 0 ? 'refreshed' : 'sent',
      message:
        failedRecipientCount > 0
          ? 'No queued local recipients remain; failed recipients need attention'
          : 'No queued local recipients remain for this campaign run',
    };
  }

  let sent = 0;
  let failed = 0;
  const browserViewUrl = buildLocalCampaignBrowserViewUrl(run.id);
  for (const recipient of recipients.rows) {
    try {
      const unsubscribeUrl = buildLocalCampaignUnsubscribeUrl(run.id, recipient.id, recipient.email);
      const emailContent = appendUnsubscribeFooter(appendBrowserViewLink({ html, plainText }, browserViewUrl), unsubscribeUrl);
      const ok = await sendMail({
        to: recipient.email,
        subject,
        text: emailContent.plainText,
        html: emailContent.html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      if (ok) {
        sent++;
        await pool.query(
          `UPDATE campaign_run_recipients
              SET status = 'sent',
                  sent_at = CURRENT_TIMESTAMP,
                  failure_message = NULL,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [recipient.id]
        );
      } else {
        failed++;
        await pool.query(
          `UPDATE campaign_run_recipients
              SET status = 'failed',
                  failure_message = 'SMTP send failed',
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [recipient.id]
        );
      }
    } catch (error) {
      failed++;
      await pool.query(
        `UPDATE campaign_run_recipients
            SET status = 'failed',
                failure_message = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [recipient.id, error instanceof Error ? error.message : 'SMTP send failed']
      );
    }
  }

  const remaining = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM campaign_run_recipients
      WHERE campaign_run_id = $1
        AND status = 'queued'`,
    [run.id]
  );
  const remainingQueued = Number(remaining.rows[0]?.count ?? 0);
  const status: CommunicationCampaignRunStatus = remainingQueued > 0 ? 'sending' : failed > 0 ? 'failed' : 'sent';
  const updated = await updateRunCounts(
    run.id,
    {
      lastLocalBatch: {
        attempted: recipients.rows.length,
        sent,
        failed,
        remainingQueued,
        processedAt: new Date().toISOString(),
      },
    },
    status,
    failed > 0 ? 'One or more local email recipients failed' : null
  );

  logger.info('Local communications campaign batch processed', {
    runId: run.id,
    attempted: recipients.rows.length,
    sent,
    failed,
    remainingQueued,
  });

  return {
    run: updated,
    action: remainingQueued > 0 ? 'queued' : 'sent',
    message:
      remainingQueued > 0
        ? 'Local campaign batch sent; queued recipients remain'
        : 'Local campaign run sent',
  };
};

export const cancelCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return unsupportedMailchimpRunAction(
      run,
      'Mailchimp campaign-run cancellation is not implemented by this backend contract.'
    );
  }
  if (!['draft', 'scheduled', 'sending'].includes(run.status)) {
    throw new CommunicationsValidationError(`Campaign run cannot be canceled from ${run.status} status`);
  }

  const canceledRecipients = await pool.query<{ id: string }>(
    `UPDATE campaign_run_recipients
        SET status = 'canceled',
            failure_message = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE campaign_run_id = $1
        AND status IN ('queued', 'sending')
      RETURNING id`,
    [run.id]
  );
  const updated = await updateRunCounts(
    run.id,
    {
      canceledRecipientCount: canceledRecipients.rows.length,
      canceledAt: new Date().toISOString(),
    },
    'canceled',
    null
  );

  return {
    run: updated,
    action: 'canceled',
    message: 'Local campaign run canceled',
  };
};

export const rescheduleCampaignRun = async (
  runId: string,
  request: CommunicationCampaignRescheduleRequest,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return unsupportedMailchimpRunAction(
      run,
      'Mailchimp campaign-run rescheduling is not implemented by this backend contract.'
    );
  }
  if (!['draft', 'scheduled'].includes(run.status)) {
    throw new CommunicationsValidationError(`Campaign run cannot be rescheduled from ${run.status} status`);
  }
  if (Number.isNaN(request.sendTime.getTime())) {
    throw new CommunicationsValidationError('A valid sendTime is required');
  }

  const result = await pool.query<CampaignRunRow>(
    `UPDATE campaign_runs
        SET requested_send_time = $2,
            status = 'scheduled',
            counts = COALESCE(counts, '{}'::jsonb) || $3::jsonb,
            failure_message = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, provider, provider_campaign_id, title, list_id, include_audience_id,
                exclusion_audience_ids, suppression_snapshot, test_recipients, audience_snapshot,
                content_snapshot, requested_send_time, status, counts, scope_account_ids,
                failure_message, requested_by, created_at, updated_at`,
    [
      run.id,
      request.sendTime,
      JSON.stringify({ rescheduledAt: new Date().toISOString() }),
    ]
  );
  if (!result.rows[0]) {
    throw new CommunicationsValidationError('Campaign run was not found');
  }
  const updated = mapRunRow(result.rows[0]);

  return {
    run: updated,
    action: 'rescheduled',
    message: 'Local campaign run rescheduled',
  };
};

export const refreshCampaignRunStatus = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignActionResult | null> => {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (run.provider === 'mailchimp') {
    return mailchimpService.refreshCampaignRunStatus(
      runId,
      requesterScopeAccountIds
    ) as Promise<CommunicationCampaignActionResult | null>;
  }
  const statusCounts = await pool.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
       FROM campaign_run_recipients
      WHERE campaign_run_id = $1
      GROUP BY status`,
    [run.id]
  );
  const countsByStatus = new Map(
    statusCounts.rows.map((row) => [row.status, Number(row.count ?? 0)])
  );
  const queuedRecipientCount = countsByStatus.get('queued') ?? 0;
  const sendingRecipientCount = countsByStatus.get('sending') ?? 0;
  const sentRecipientCount = countsByStatus.get('sent') ?? 0;
  const failedRecipientCount = countsByStatus.get('failed') ?? 0;
  const suppressedRecipientCount = countsByStatus.get('suppressed') ?? 0;
  const canceledRecipientCount = countsByStatus.get('canceled') ?? 0;
  const totalRecipientCount = Array.from(countsByStatus.values()).reduce(
    (total, count) => total + count,
    0
  );
  const nextStatus: CommunicationCampaignRunStatus =
    run.status === 'sending'
      ? queuedRecipientCount + sendingRecipientCount > 0
        ? 'sending'
        : failedRecipientCount > 0
          ? 'failed'
          : 'sent'
      : run.status;
  const updated = await updateRunCounts(
    run.id,
    {
      totalRecipientCount,
      queuedRecipientCount,
      sendingRecipientCount,
      sentRecipientCount,
      failedRecipientCount,
      suppressedRecipientCount,
      canceledRecipientCount,
      statusRefreshedAt: new Date().toISOString(),
    },
    nextStatus,
    nextStatus === 'failed' ? run.failureMessage ?? 'One or more local email recipients failed' : null
  );
  return {
    run: updated,
    action: 'refreshed',
    message: 'Local campaign run status is managed from recipient delivery rows',
  };
};

export const sendCampaignTest = async (
  request: CommunicationCampaignTestSendRequest
): Promise<CommunicationCampaignTestSendResponse> => {
  if ((request.provider ?? 'local_email') === 'mailchimp') {
    return mailchimpService.sendDraftCampaignTest(asMailchimpRequest(request));
  }

  const content = resolveMailchimpCampaignContent(asMailchimpRequest(request));
  const recipients = uniqueStrings(request.testRecipients.map((email) => email.toLowerCase()));
  if (recipients.length === 0) {
    throw new CommunicationsValidationError('At least one test recipient is required');
  }

  let delivered = 0;
  for (const recipient of recipients) {
    const ok = await sendMail({
      to: recipient,
      subject: request.subject,
      text: content.plainText,
      html: content.html,
    });
    if (ok) {
      delivered++;
    }
  }

  return {
    delivered: delivered === recipients.length,
    recipients,
    providerCampaignId: null,
    message:
      delivered === recipients.length
        ? 'Local campaign test email sent successfully'
        : 'One or more local campaign test emails failed',
  };
};

export default {
  getStatus,
  listProviderAudiences,
  getProviderAudience,
  listAudiences,
  archiveAudience,
  createAudience,
  previewAudience,
  previewCampaign,
  listCampaigns,
  createCampaign,
  listCampaignRuns,
  listCampaignRunRecipients,
  sendCampaignRun,
  cancelCampaignRun,
  rescheduleCampaignRun,
  retryFailedCampaignRunRecipients,
  refreshCampaignRunStatus,
  sendCampaignTest,
};
