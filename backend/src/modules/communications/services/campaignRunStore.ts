import pool from '@config/database';
import type {
  CommunicationCampaignRecipientList,
  CommunicationCampaignRun,
  CommunicationCampaignRunStatus,
  CommunicationRecipientStatus,
} from '@app-types/communications';
import {
  CommunicationsValidationError,
  mapRecipientRow,
  mapRunRow,
  uniqueStrings,
} from './communicationsServiceHelpers';
import type { CampaignRunRecipientRow, CampaignRunRow } from './communicationsServiceHelpers';

export const findMailchimpRunIds = async (
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

export const updateRunCounts = async (
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
      RETURNING id, provider, provider_campaign_id, appeal_campaign_id, title, list_id, include_audience_id,
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
    `SELECT id, provider, provider_campaign_id, appeal_campaign_id, title, list_id, include_audience_id,
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

export const getCampaignRun = async (
  runId: string,
  requesterScopeAccountIds?: string[]
): Promise<CommunicationCampaignRun | null> => {
  const scopeAccountIds = uniqueStrings(requesterScopeAccountIds ?? []);
  const result = await pool.query<CampaignRunRow>(
    `SELECT id, provider, provider_campaign_id, appeal_campaign_id, title, list_id, include_audience_id,
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
