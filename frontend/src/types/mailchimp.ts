/**
 * Mailchimp Types for Frontend
 * Type definitions for email marketing UI
 */

/**
 * Mailchimp configuration status
 */
export interface MailchimpStatus {
  configured: boolean;
  accountName?: string;
  listCount?: number;
}

/**
 * Mailchimp audience/list
 */
export interface MailchimpList {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  doubleOptIn: boolean;
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

export interface CampaignRun {
  id: string;
  provider: 'mailchimp';
  providerCampaignId?: string | null;
  title: string;
  listId: string;
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
  suppressionSnapshot?: unknown[];
  testRecipients?: string[];
  audienceSnapshot?: Record<string, unknown>;
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
  isCreatingCampaign: boolean;
  isSendingCampaign: boolean;
  error: string | null;
}
