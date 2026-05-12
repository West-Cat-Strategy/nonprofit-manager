import type {
  CommunicationAudience,
  CommunicationCampaign,
  CommunicationCampaignRecipient,
  CommunicationCampaignRun,
  CommunicationCampaignRunStatus,
  CommunicationProvider,
  CommunicationRecipientStatus,
  CreateCommunicationCampaignRequest,
  MailchimpCompatibleCampaignRequest,
} from '@app-types/communications';
import type { MailchimpCampaign } from '@app-types/mailchimp';

export interface SavedAudienceRow {
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

export interface CampaignRunRow {
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

export interface ContactRecipientRow {
  id: string;
  account_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  do_not_email: boolean | null;
  suppressed: boolean | null;
}

export interface CampaignRunRecipientRow {
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

export interface DeliveryCounts {
  requestedContactCount: number;
  queuedRecipientCount: number;
  suppressedRecipientCount: number;
  missingEmailCount: number;
  doNotEmailCount: number;
}

export const LOCAL_BATCH_LIMIT = 50;
export const LOCAL_AUDIENCE_ID = 'local_email:crm';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CommunicationsValidationError extends Error {
  statusCode = 400;
}

export const uniqueStrings = (values: readonly string[] = []): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

export const assertUuidList = (values: readonly string[], label: string): void => {
  const invalid = values.find((value) => !uuidPattern.test(value));
  if (invalid) {
    throw new CommunicationsValidationError(`${label} must contain only UUID values`);
  }
};

export const mapAudienceRow = (row: SavedAudienceRow): CommunicationAudience => ({
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

export const mapRunRow = (row: CampaignRunRow): CommunicationCampaignRun => ({
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

export const mapRecipientRow = (row: CampaignRunRecipientRow): CommunicationCampaignRecipient => ({
  id: row.id,
  campaignRunId: row.campaign_run_id,
  contactId: row.contact_id,
  email: row.email,
  status: row.status,
  contactName: row.contact_name,
  failureMessage: row.failure_message,
  sentAt: row.sent_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapLocalRunToCampaign = (run: CommunicationCampaignRun): CommunicationCampaign => {
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

export const mapMailchimpCampaign = (
  campaign: MailchimpCampaign,
  campaignRunId?: string
): CommunicationCampaign => ({
  ...campaign,
  provider: 'mailchimp',
  campaignRunId,
  providerCampaignId: campaign.id,
});

export const asMailchimpRequest = (
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
