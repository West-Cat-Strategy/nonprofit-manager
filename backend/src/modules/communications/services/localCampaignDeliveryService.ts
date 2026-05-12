import pool from '@config/database';
import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import { resolveMailchimpCampaignContent } from '@services/template/emailCampaignRenderer';
import type {
  CommunicationCampaign,
  CommunicationCampaignActionResult,
  CommunicationCampaignRun,
  CommunicationCampaignRescheduleRequest,
  CommunicationCampaignRunStatus,
  CreateCommunicationCampaignRequest,
} from '@app-types/communications';
import {
  appendBrowserViewLink,
  appendUnsubscribeFooter,
  buildLocalCampaignBrowserViewUrl,
  buildLocalCampaignUnsubscribeUrl,
} from './localCampaignUnsubscribeHelpers';
import { getCampaignRun, updateRunCounts } from './campaignRunStore';
import {
  asMailchimpRequest,
  CommunicationsValidationError,
  LOCAL_AUDIENCE_ID,
  LOCAL_BATCH_LIMIT,
  mapLocalRunToCampaign,
  mapRunRow,
  uniqueStrings,
} from './communicationsServiceHelpers';
import type {
  CampaignRunRow,
  ContactRecipientRow,
  DeliveryCounts,
} from './communicationsServiceHelpers';
import {
  isLocalAudienceId,
  loadEligibleContacts,
  loadLocalAudienceContactIds,
  previewAudience,
  resolveRequestedContactIds,
} from './savedAudienceService';

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

export const createLocalCampaign = async (
  request: CreateCommunicationCampaignRequest
): Promise<CommunicationCampaign> => {
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

export const sendLocalCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[],
  loadedRun?: CommunicationCampaignRun
): Promise<CommunicationCampaignActionResult | null> => {
  const run = loadedRun ?? (await getCampaignRun(runId, requesterScopeAccountIds));
  if (!run) {
    return null;
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

export const cancelLocalCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[],
  loadedRun?: CommunicationCampaignRun
): Promise<CommunicationCampaignActionResult | null> => {
  const run = loadedRun ?? (await getCampaignRun(runId, requesterScopeAccountIds));
  if (!run) {
    return null;
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

export const rescheduleLocalCampaignRun = async (
  runId: string,
  request: CommunicationCampaignRescheduleRequest,
  requesterScopeAccountIds?: string[],
  loadedRun?: CommunicationCampaignRun
): Promise<CommunicationCampaignActionResult | null> => {
  const run = loadedRun ?? (await getCampaignRun(runId, requesterScopeAccountIds));
  if (!run) {
    return null;
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

export const refreshLocalCampaignRunStatus = async (
  runId: string,
  requesterScopeAccountIds?: string[],
  loadedRun?: CommunicationCampaignRun
): Promise<CommunicationCampaignActionResult | null> => {
  const run = loadedRun ?? (await getCampaignRun(runId, requesterScopeAccountIds));
  if (!run) {
    return null;
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
