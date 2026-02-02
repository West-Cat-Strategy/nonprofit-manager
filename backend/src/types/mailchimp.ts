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
