/**
 * Mailchimp Types for Frontend
 * Type definitions for email marketing UI
 */

export type CommunicationProvider = 'local_email' | 'mailchimp';

export interface CommunicationProviderStatus {
  provider: CommunicationProvider;
  configured: boolean;
  ready?: boolean;
  accountName?: string;
  audienceCount?: number;
  fromAddress?: string | null;
  fromName?: string | null;
  message?: string;
}

/**
 * Communications configuration status. The name is retained for legacy imports.
 */
export interface MailchimpStatus {
  configured: boolean;
  accountName?: string;
  listCount?: number;
  defaultProvider?: CommunicationProvider;
  provider?: CommunicationProvider;
  localEmail?: CommunicationProviderStatus;
  mailchimp?: CommunicationProviderStatus;
  providers?: Partial<Record<CommunicationProvider, CommunicationProviderStatus>>;
}

/**
 * Mailchimp audience/list
 */
export interface MailchimpList {
  id: string;
  name: string;
  memberCount: number;
  createdAt?: string;
  doubleOptIn: boolean;
  provider?: CommunicationProvider;
  description?: string;
  isDefault?: boolean;
}

/**
 * Mailchimp member status
 */
export type MailchimpMemberStatus = 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';

/**
 * Mailchimp member/subscriber
 */
export interface MailchimpMember {
  id: string;
  emailAddress: string;
  status: MailchimpMemberStatus;
  mergeFields: Record<string, unknown>;
  tags: string[];
  listId: string;
  createdAt: string;
  lastChanged: string;
}

/**
 * Mailchimp tag
 */
export interface MailchimpTag {
  id: number;
  name: string;
  memberCount?: number;
}

/**
 * Mailchimp campaign
 */
export interface MailchimpCampaign {
  id: string;
  provider?: CommunicationProvider;
  campaignRunId?: string;
  type: 'regular' | 'plaintext' | 'absplit' | 'rss' | 'variate';
  status: 'save' | 'paused' | 'schedule' | 'sending' | 'sent' | 'canceled' | 'canceling' | 'archived';
  title: string;
  subject?: string;
  listId: string;
  createdAt: string;
  sendTime?: string;
  emailsSent?: number;
  reportSummary?: {
    opens: number;
    uniqueOpens: number;
    openRate: number;
    clicks: number;
    uniqueClicks: number;
    clickRate: number;
    unsubscribes: number;
  };
}

export type SavedAudienceStatus = 'active' | 'archived';

export interface SavedAudience {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  sourceCount: number;
  scopeAccountIds?: string[];
  status: SavedAudienceStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
}

export interface CreateSavedAudienceRequest {
  name: string;
  description?: string;
  filters: Record<string, unknown>;
}

export type CampaignRunStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'canceled';
export type CampaignRunRecipientStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'suppressed'
  | 'canceled';

export interface CampaignRun {
  id: string;
  provider: CommunicationProvider;
  providerCampaignId?: string | null;
  title: string;
  listId: string | null;
  includeAudienceId?: string | null;
  exclusionAudienceIds: string[];
  suppressionSnapshot: unknown[];
  testRecipients: string[];
  audienceSnapshot: Record<string, unknown>;
  requestedSendTime?: string | null;
  status: CampaignRunStatus;
  counts: Record<string, unknown>;
  failureMessage?: string | null;
  requestedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRunProviderMetrics {
  lastReportedAt?: string | null;
  refreshedAt?: string | null;
  emailsSent?: number;
  opens?: number;
  uniqueOpens?: number;
  openRate?: number;
  clicks?: number;
  uniqueClicks?: number;
  clickRate?: number;
  unsubscribes?: number;
  bounces?: number;
  abuseReports?: number;
  lastSyncedAt?: string | null;
  [key: string]: unknown;
}

export interface CampaignRunRecipient {
  id: string;
  campaignRunId: string;
  contactId?: string | null;
  email: string;
  status: CampaignRunRecipientStatus;
  contactName?: string | null;
  failureMessage?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRunRecipientList {
  runId: string;
  status?: CampaignRunRecipientStatus;
  limit: number;
  recipients: CampaignRunRecipient[];
}

/**
 * Mailchimp segment
 */
export interface MailchimpSegment {
  id: number;
  name: string;
  memberCount: number;
  listId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sync contact request
 */
export interface SyncContactRequest {
  contactId: string;
  listId: string;
  tags?: string[];
}

/**
 * Bulk sync request
 */
export interface BulkSyncRequest {
  contactIds: string[];
  listId: string;
  tags?: string[];
}

/**
 * Sync result for a single contact
 */
export interface SyncResult {
  contactId: string;
  email: string;
  success: boolean;
  action: 'added' | 'updated' | 'skipped';
  error?: string;
}

/**
 * Bulk sync response
 */
export interface BulkSyncResponse {
  total: number;
  added: number;
  updated: number;
  skipped: number;
  errors: number;
  results: SyncResult[];
}

/**
 * Request to create a campaign
 */
export interface CreateCampaignRequest {
  provider?: CommunicationProvider;
  listId: string;
  title: string;
  subject: string;
  previewText?: string;
  fromName: string;
  replyTo: string;
  htmlContent?: string;
  plainTextContent?: string;
  builderContent?: EmailBuilderContent;
  segmentId?: number;
  sendTime?: string;
  includeAudienceId?: string;
  exclusionAudienceIds?: string[];
  priorRunSuppressionIds?: string[];
  suppressionSnapshot?: unknown[];
  testRecipients?: string[];
  audienceSnapshot?: Record<string, unknown>;
}

export interface CampaignTestSendRequest extends CreateCampaignRequest {
  testRecipients: string[];
}

export interface CampaignTestSendResponse {
  delivered: boolean;
  recipients: string[];
  providerCampaignId?: string | null;
  message?: string;
}

export interface CampaignRunActionResponse {
  run: CampaignRun;
  action:
    | 'sent'
    | 'queued'
    | 'processed_batch'
    | 'refreshed'
    | 'canceled'
    | 'rescheduled'
    | 'unsupported';
  message: string;
}

export type EmailBuilderBlockType = 'heading' | 'paragraph' | 'button' | 'image' | 'divider';

interface EmailBuilderBlockBase {
  id: string;
  type: EmailBuilderBlockType;
}

export interface EmailHeadingBlock extends EmailBuilderBlockBase {
  type: 'heading';
  content: string;
  level?: 1 | 2 | 3;
}

export interface EmailParagraphBlock extends EmailBuilderBlockBase {
  type: 'paragraph';
  content: string;
}

export interface EmailButtonBlock extends EmailBuilderBlockBase {
  type: 'button';
  label: string;
  url: string;
}

export interface EmailImageBlock extends EmailBuilderBlockBase {
  type: 'image';
  src: string;
  alt?: string;
  href?: string;
}

export interface EmailDividerBlock extends EmailBuilderBlockBase {
  type: 'divider';
}

export type EmailBuilderBlock =
  | EmailHeadingBlock
  | EmailParagraphBlock
  | EmailButtonBlock
  | EmailImageBlock
  | EmailDividerBlock;

export interface EmailBuilderContent {
  accentColor?: string;
  footerText?: string;
  blocks: EmailBuilderBlock[];
}

export interface MailchimpCampaignPreview {
  subject: string;
  previewText?: string;
  html: string;
  plainText: string;
  warnings: string[];
}

/**
 * Mailchimp state for Redux
 */
export interface MailchimpState {
  status: MailchimpStatus | null;
  lists: MailchimpList[];
  selectedList: MailchimpList | null;
  tags: MailchimpTag[];
  campaigns: MailchimpCampaign[];
  savedAudiences: SavedAudience[];
  campaignRuns: CampaignRun[];
  segments: MailchimpSegment[];
  segmentsListId: string | null;
  syncResult: BulkSyncResponse | null;
  isLoading: boolean;
  isSyncing: boolean;
  isLoadingSavedAudiences: boolean;
  isCreatingSavedAudience: boolean;
  isArchivingSavedAudience: boolean;
  savedAudienceMessage: string | null;
  savedAudienceError: string | null;
  savedAudienceLoadError: string | null;
  savedAudienceCreateError: string | null;
  isLoadingCampaignRuns: boolean;
  campaignRunsError: string | null;
  campaignRunActionMessage: string | null;
  campaignRunActionError: string | null;
  campaignRunRecipients: Record<string, CampaignRunRecipient[]>;
  campaignRunRecipientsStatus: Record<string, CampaignRunRecipientStatus | 'all'>;
  isLoadingCampaignRunRecipients: Record<string, boolean>;
  campaignRunRecipientsError: Record<string, string | null>;
  isCreatingCampaign: boolean;
  isSendingCampaign: boolean;
  isTestingCampaign: boolean;
  error: string | null;
}
