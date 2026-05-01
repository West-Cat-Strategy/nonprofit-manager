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
  CampaignRun,
  CreateSegmentRequest,
  MailchimpSegment,
  CreateCampaignRequest,
  MailchimpWebhookPayload,
  MailchimpCampaignProviderMetrics,
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
import {
  CampaignTargetingValidationError,
  archiveSavedAudience,
  createPendingCampaignRun,
  createSavedAudience,
  finalizeCampaignRun,
  getCampaignRun,
  listCampaignRuns,
  listSavedAudiences,
  markCampaignRunFailed,
  prepareSavedAudienceTargeting,
  recordCampaignLifecycleWebhook,
  updateCampaignRunStatus,
} from './mailchimpCampaignRuns';
import { recordContactSuppressionEvidence as recordContactSuppressionEvidenceForContact } from '@modules/contacts/services/contactSuppressionService';

export {
  CampaignTargetingValidationError,
  archiveSavedAudience,
  createSavedAudience,
  getCampaignRun,
  listCampaignRuns,
  listSavedAudiences,
  recordCampaignLifecycleWebhook,
} from './mailchimpCampaignRuns';

const CONTACT_SELECT_QUERY = `SELECT id AS contact_id, account_id, first_name, last_name, email, phone,
        address_line1, address_line2, city, state_province, postal_code, country,
        do_not_email
 FROM contacts WHERE id = $1`;

interface CampaignRunActionResult {
  run: CampaignRun;
  action: 'sent' | 'refreshed' | 'unsupported';
  message: string;
}

interface SendCampaignTestRequest {
  campaignId: string;
  testRecipients: string[];
  sendType?: 'html' | 'plain_text';
  runId?: string;
}

interface DraftCampaignTestResult {
  delivered: boolean;
  recipients: string[];
  providerCampaignId: string;
  message: string;
}

const throwCampaignTargetingValidation = (message: string): never => {
  throw new CampaignTargetingValidationError(message);
};

const asNumber = (value: unknown): number | undefined => {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const addNumberMetric = (
  metrics: Record<string, unknown>,
  key: string,
  ...values: unknown[]
): void => {
  const value = values.map(asNumber).find((candidate) => candidate !== undefined);
  if (value !== undefined) {
    metrics[key] = value;
  }
};

const getObjectRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};

const getFirstString = (...values: unknown[]): string | undefined => {
  const value = values.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value : undefined;
};

const buildProviderMetrics = (
  campaign: Record<string, unknown>,
  report: Record<string, unknown> | undefined,
  refreshedAt: string
): MailchimpCampaignProviderMetrics => {
  const reportSummary = getObjectRecord(campaign.report_summary);
  const opens = getObjectRecord(report?.opens);
  const clicks = getObjectRecord(report?.clicks);
  const bounces = getObjectRecord(report?.bounces);
  const metrics: MailchimpCampaignProviderMetrics = { lastReportedAt: refreshedAt, refreshedAt };
  const metricRecord = metrics as unknown as Record<string, unknown>;

  addNumberMetric(metricRecord, 'emailsSent', report?.emails_sent, campaign.emails_sent);
  addNumberMetric(metricRecord, 'opens', opens.opens_total, reportSummary.opens);
  addNumberMetric(metricRecord, 'uniqueOpens', opens.unique_opens, reportSummary.unique_opens);
  addNumberMetric(metricRecord, 'openRate', opens.open_rate, reportSummary.open_rate);
  addNumberMetric(metricRecord, 'clicks', clicks.clicks_total, reportSummary.clicks);
  addNumberMetric(metricRecord, 'uniqueClicks', clicks.unique_clicks, reportSummary.subscriber_clicks);
  addNumberMetric(metricRecord, 'clickRate', clicks.click_rate, reportSummary.click_rate);
  addNumberMetric(metricRecord, 'unsubscribes', report?.unsubscribed, report?.unsubscribes);
  addNumberMetric(metricRecord, 'abuseReports', report?.abuse_reports);
  addNumberMetric(metricRecord, 'forwards', report?.forwards);

  const bounceMetrics: Record<string, unknown> = {};
  addNumberMetric(bounceMetrics, 'hard', bounces.hard_bounces, report?.hard_bounces);
  addNumberMetric(bounceMetrics, 'soft', bounces.soft_bounces, report?.soft_bounces);
  addNumberMetric(bounceMetrics, 'syntax', bounces.syntax_errors, report?.syntax_errors);
  if (Object.keys(bounceMetrics).length > 0) {
    addNumberMetric(
      bounceMetrics,
      'total',
      (asNumber(bounceMetrics.hard) ?? 0) +
        (asNumber(bounceMetrics.soft) ?? 0) +
        (asNumber(bounceMetrics.syntax) ?? 0)
    );
    metrics.bounces = bounceMetrics;
  }

  const lastOpenAt = getFirstString(opens.last_open);
  const lastClickAt = getFirstString(clicks.last_click);
  if (lastOpenAt) metrics.lastOpenAt = lastOpenAt;
  if (lastClickAt) metrics.lastClickAt = lastClickAt;

  return metrics;
};

const getWebhookDataValue = (
  payload: MailchimpWebhookPayload,
  camelKey: keyof MailchimpWebhookPayload['data'],
  snakeKey: string
): unknown => {
  const data = payload.data as MailchimpWebhookPayload['data'] & Record<string, unknown>;
  return data[camelKey] ?? data[snakeKey];
};

const normalizeWebhookEmail = (value: unknown): string | null =>
  typeof value === 'string' && value.includes('@') ? value.trim().toLowerCase() : null;

const getWebhookEmail = (payload: MailchimpWebhookPayload): string | null =>
  normalizeWebhookEmail(getWebhookDataValue(payload, 'email', 'email_address'));

const getWebhookListId = (payload: MailchimpWebhookPayload): string | null => {
  const value = getWebhookDataValue(payload, 'listId', 'list_id');
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const getWebhookOldEmail = (payload: MailchimpWebhookPayload): string | null =>
  normalizeWebhookEmail(getWebhookDataValue(payload, 'oldEmail', 'old_email'));

const getWebhookNewEmail = (payload: MailchimpWebhookPayload): string | null =>
  normalizeWebhookEmail(getWebhookDataValue(payload, 'newEmail', 'new_email'));

const contactPreferenceWebhookSummary = (
  payload: MailchimpWebhookPayload,
  affectedCount: number
): Record<string, unknown> => ({
  type: payload.type,
  listId: getWebhookListId(payload),
  affectedCount,
  hasEmail: Boolean(getWebhookEmail(payload)),
  hasOldEmail: Boolean(getWebhookOldEmail(payload)),
  hasNewEmail: Boolean(getWebhookNewEmail(payload)),
});

const mapProviderCampaignStatus = (status: unknown): CampaignRun['status'] | null => {
  const value = String(status ?? '').toLowerCase();
  if (value === 'save') return 'draft';
  if (value === 'schedule' || value === 'scheduled') return 'scheduled';
  if (value === 'sending') return 'sending';
  if (value === 'sent') return 'sent';
  if (value === 'canceled' || value === 'cancelled' || value === 'canceling') return 'canceled';
  return null;
};

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
    const targeting = await prepareSavedAudienceTargeting(request, pendingRun.id, bulkSyncContacts);
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

    if ((request.testRecipients ?? []).length > 0) {
      await sendCampaignTest({
        campaignId: campaign.id,
        testRecipients: request.testRecipients ?? [],
      });
    }

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

    if ((request.testRecipients ?? []).length > 0) {
      await updateCampaignRunStatus(pendingRun.id, request.sendTime ? 'scheduled' : 'draft', {
        testSend: {
          sentAt: new Date().toISOString(),
          recipientCount: request.testRecipients?.length ?? 0,
          sendType: 'html',
        },
      });
    }

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

export async function sendDraftCampaignTest(
  request: CreateCampaignRequest
): Promise<DraftCampaignTestResult> {
  assertMailchimpConfigured('Mailchimp is not configured. Campaign test cannot be sent.');

  if (!request.testRecipients?.length) {
    throwCampaignTargetingValidation('At least one test recipient is required');
  }
  const testRecipients = request.testRecipients ?? [];

  const resolvedContent = resolveMailchimpCampaignContent(request);
  const campaign = await mailchimpClient.campaigns.create(buildCampaignCreatePayload(request));

  await mailchimpClient.campaigns.setContent(
    campaign.id,
    buildCampaignContentPayload(resolvedContent)
  );

  await sendCampaignTest({
    campaignId: campaign.id,
    testRecipients,
  });

  const recipients = Array.from(
    new Set(testRecipients.map((email) => email.trim().toLowerCase()).filter(Boolean))
  );

  return {
    delivered: true,
    recipients,
    providerCampaignId: campaign.id,
    message: 'Campaign test email sent successfully',
  };
}

export async function sendCampaignTest(request: SendCampaignTestRequest): Promise<void> {
  assertMailchimpConfigured('Mailchimp is not configured. Campaign test cannot be sent.');

  const testRecipients = Array.from(
    new Set(request.testRecipients.map((email) => email.trim().toLowerCase()).filter(Boolean))
  );

  if (testRecipients.length === 0) {
    throwCampaignTargetingValidation('At least one test recipient is required');
  }

  await mailchimpClient.campaigns.sendTestEmail(request.campaignId, {
    test_emails: testRecipients,
    send_type: request.sendType ?? 'html',
  });

  if (request.runId) {
    await updateCampaignRunStatus(request.runId, 'draft', {
      testSend: {
        sentAt: new Date().toISOString(),
        recipientCount: testRecipients.length,
        sendType: request.sendType ?? 'html',
      },
    });
  }

  logger.info('Campaign test email sent', {
    campaignId: request.campaignId,
    recipientCount: testRecipients.length,
  });
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

export async function sendCampaignRun(
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CampaignRunActionResult | null> {
  assertMailchimpConfigured('Mailchimp is not configured. Campaign cannot be sent.');

  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  const providerCampaignId = run.providerCampaignId ?? '';
  if (!providerCampaignId) {
    throwCampaignTargetingValidation('Campaign run does not have a Mailchimp campaign id');
  }
  if (!['draft', 'scheduled', 'failed'].includes(run.status)) {
    throwCampaignTargetingValidation(`Campaign run cannot be sent from ${run.status} status`);
  }

  await mailchimpClient.campaigns.send(providerCampaignId);
  const updated = await updateCampaignRunStatus(run.id, 'sent');

  return {
    run: updated,
    action: 'sent',
    message: 'Campaign run sent successfully',
  };
}

export async function refreshCampaignRunStatus(
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CampaignRunActionResult | null> {
  assertMailchimpConfigured('Mailchimp is not configured. Campaign status cannot be refreshed.');

  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }
  if (!run.providerCampaignId) {
    return {
      run,
      action: 'unsupported',
      message: 'Campaign run does not have a Mailchimp campaign id yet',
    };
  }

  const campaign = getObjectRecord(await mailchimpClient.campaigns.get(run.providerCampaignId));
  let report: Record<string, unknown> | undefined;
  try {
    if (typeof mailchimpClient.reports?.getCampaignReport === 'function') {
      report = getObjectRecord(await mailchimpClient.reports.getCampaignReport(run.providerCampaignId));
    }
  } catch (error) {
    logger.warn('Failed to refresh Mailchimp campaign report metrics', {
      campaignId: run.providerCampaignId,
      error,
    });
  }

  const refreshedAt = new Date().toISOString();
  const nextStatus = mapProviderCampaignStatus(campaign.status) ?? run.status;
  const updated = await updateCampaignRunStatus(run.id, nextStatus, {
    providerStatus: {
      status: campaign.status ?? null,
      emailsSent: asNumber(campaign.emails_sent) ?? null,
      refreshedAt,
    },
    providerReportSummary: buildProviderMetrics(campaign, report, refreshedAt),
  });

  return {
    run: updated,
    action: 'refreshed',
    message: 'Campaign run status refreshed',
  };
}

export async function cancelCampaignRun(
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CampaignRunActionResult | null> {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }

  return {
    run,
    action: 'unsupported',
    message: 'Mailchimp campaign cancellation is not supported by this backend contract yet',
  };
}

export async function rescheduleCampaignRun(
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CampaignRunActionResult | null> {
  const run = await getCampaignRun(runId, requesterScopeAccountIds);
  if (!run) {
    return null;
  }

  return {
    run,
    action: 'unsupported',
    message: 'Mailchimp campaign rescheduling is not supported by this backend contract yet',
  };
}

async function recordMailchimpContactSuppressionEvidence(
  payload: MailchimpWebhookPayload,
  email: string
): Promise<number> {
  const result = await pool.query<{ id: string }>(
    `SELECT id
     FROM contacts
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  const providerEventType = payload.type === 'cleaned' ? 'cleaned' : 'unsubscribe';
  const reason = providerEventType === 'cleaned' ? 'mailchimp_cleaned' : 'mailchimp_unsubscribe';
  const providerListId = getWebhookListId(payload);
  const providerEventId = getWebhookDataValue(payload, 'id', 'id');
  const providerReason = getWebhookDataValue(payload, 'reason', 'reason');

  for (const row of result.rows) {
    await recordContactSuppressionEvidenceForContact({
      contactId: row.id,
      channel: 'email',
      reason,
      source: 'mailchimp_webhook',
      provider: 'mailchimp',
      providerListId,
      providerEventId: typeof providerEventId === 'string' ? providerEventId : null,
      providerEventType,
      providerReason: typeof providerReason === 'string' ? providerReason : null,
      preserveDoNotEmail: true,
      evidence: {
        type: payload.type,
        listId: providerListId,
        firedAt: payload.firedAt,
        hasEmail: true,
      },
    });
  }

  return result.rowCount ?? 0;
}

export async function recordContactPreferenceWebhook(
  payload: MailchimpWebhookPayload
): Promise<{ updated: boolean; affectedCount: number }> {
  const email = getWebhookEmail(payload);
  const oldEmail = getWebhookOldEmail(payload);
  const newEmail = getWebhookNewEmail(payload);
  let affectedCount = 0;

  if (payload.type === 'unsubscribe' && email) {
    await recordMailchimpContactSuppressionEvidence(payload, email);
    const result = await pool.query(
      `UPDATE contacts
       SET do_not_email = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    affectedCount = result.rowCount ?? 0;
  } else if (payload.type === 'cleaned' && email) {
    await recordMailchimpContactSuppressionEvidence(payload, email);
    const result = await pool.query(
      `UPDATE contacts
       SET do_not_email = true,
           preferred_contact_method = CASE
             WHEN preferred_contact_method = 'email' THEN NULL
             ELSE preferred_contact_method
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    affectedCount = result.rowCount ?? 0;
  } else if (payload.type === 'profile' && email) {
    const merges = payload.data?.merges ?? {};
    const result = await pool.query(
      `UPDATE contacts
       SET first_name = COALESCE(NULLIF($2, ''), first_name),
           last_name = COALESCE(NULLIF($3, ''), last_name),
           phone = COALESCE(NULLIF($4, ''), phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($1)`,
      [
        email,
        typeof merges.FNAME === 'string' ? merges.FNAME.trim() : '',
        typeof merges.LNAME === 'string' ? merges.LNAME.trim() : '',
        typeof merges.PHONE === 'string' ? merges.PHONE.trim() : '',
      ]
    );
    affectedCount = result.rowCount ?? 0;
  } else if (payload.type === 'upemail' && oldEmail && newEmail) {
    const result = await pool.query(
      `UPDATE contacts
       SET email = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($1)
         AND NOT EXISTS (
           SELECT 1 FROM contacts existing
           WHERE LOWER(existing.email) = LOWER($2)
             AND existing.id <> contacts.id
         )`,
      [oldEmail, newEmail]
    );
    affectedCount = result.rowCount ?? 0;
  }

  logger.info('Mailchimp contact webhook back-sync completed', {
    ...contactPreferenceWebhookSummary(payload, affectedCount),
    updated: affectedCount > 0,
  });

  return {
    updated: affectedCount > 0,
    affectedCount,
  };
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
  sendDraftCampaignTest,
  sendCampaignTest,
  sendCampaign,
  sendCampaignRun,
  refreshCampaignRunStatus,
  cancelCampaignRun,
  rescheduleCampaignRun,
  recordCampaignLifecycleWebhook,
  recordContactPreferenceWebhook,
  createSegment,
  getSegments,
};

export default mailchimpService;
