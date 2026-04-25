/**
 * Mailchimp Integration Type Definitions
 * Types for email marketing integration with Mailchimp
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
  createdAt: Date;
  doubleOptIn: boolean;
}

/**
 * Mailchimp member status
 */
export type MailchimpMemberStatus = 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional';

/**
 * Mailchimp merge fields (contact data fields)
 */
export interface MailchimpMergeFields {
  FNAME?: string;
  LNAME?: string;
  PHONE?: string;
  ADDRESS?: {
    addr1?: string;
    addr2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  [key: string]: unknown;
}

/**
 * Mailchimp member/subscriber
 */
export interface MailchimpMember {
  id: string;
  emailAddress: string;
  status: MailchimpMemberStatus;
  mergeFields: MailchimpMergeFields;
  tags: string[];
  listId: string;
  createdAt: Date;
  lastChanged: Date;
}

/**
 * Request to add/update a member in Mailchimp
 */
export interface AddMemberRequest {
  listId: string;
  email: string;
  status?: MailchimpMemberStatus;
  mergeFields?: MailchimpMergeFields;
  tags?: string[];
}

/**
 * Request to sync a contact to Mailchimp
 */
export interface SyncContactRequest {
  contactId: string;
  listId: string;
  tags?: string[];
}

/**
 * Bulk sync request for multiple contacts
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
  statusCode?: number;
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
 * Mailchimp tag
 */
export interface MailchimpTag {
  id: number;
  name: string;
  memberCount?: number;
}

/**
 * Request to add/remove tags from a member
 */
export interface UpdateTagsRequest {
  listId: string;
  email: string;
  tagsToAdd?: string[];
  tagsToRemove?: string[];
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
  createdAt: Date;
  sendTime?: Date;
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
  scopeAccountIds: string[];
  status: SavedAudienceStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface CommunicationsSelectedContactsAudienceFilters {
  source: 'communications_selected_contacts';
  contactIds: string[];
  listId: string;
}

export interface CreateSavedAudienceRequest {
  name: string;
  description?: string;
  filters: CommunicationsSelectedContactsAudienceFilters;
  scopeAccountIds?: string[];
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
  requestedSendTime?: Date | null;
  status: CampaignRunStatus;
  counts: Record<string, unknown>;
  scopeAccountIds: string[];
  failureMessage?: string | null;
  requestedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MailchimpCampaignTargetingCounts {
  includeSourceCount?: number;
  suppressionSourceCount?: number;
  requestedContactCount?: number;
  syncedContactCount?: number;
  skippedContactCount?: number;
  providerSegmentMemberCount?: number;
  [key: string]: unknown;
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
  sendTime?: Date;
  includeAudienceId?: string;
  exclusionAudienceIds?: string[];
  suppressionSnapshot?: unknown[];
  testRecipients?: string[];
  audienceSnapshot?: Record<string, unknown>;
  requestedBy?: string;
  scopeAccountIds?: string[];
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
 * Mailchimp webhook event types
 */
export type MailchimpWebhookType =
  | 'subscribe'
  | 'unsubscribe'
  | 'profile'
  | 'upemail'
  | 'cleaned'
  | 'campaign';

/**
 * Mailchimp webhook payload
 */
export interface MailchimpWebhookPayload {
  type: MailchimpWebhookType;
  firedAt: Date;
  data: {
    id?: string;
    listId?: string;
    email?: string;
    oldEmail?: string;
    newEmail?: string;
    merges?: MailchimpMergeFields;
    reason?: string;
  };
}

/**
 * Segment definition for list segmentation
 */
export interface SegmentCondition {
  field: string;
  op: 'is' | 'not' | 'contains' | 'notcontain' | 'greater' | 'less' | 'blank' | 'blank_not';
  value: string | number;
}

/**
 * Request to create a segment
 */
export interface CreateSegmentRequest {
  listId: string;
  name: string;
  matchType: 'any' | 'all';
  conditions: SegmentCondition[];
}

/**
 * Mailchimp segment
 */
export interface MailchimpSegment {
  id: number;
  name: string;
  memberCount: number;
  listId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact-Mailchimp sync status stored in database
 */
export interface ContactMailchimpSync {
  id: string;
  contactId: string;
  listId: string;
  mailchimpMemberId: string;
  syncedAt: Date;
  status: MailchimpMemberStatus;
}
