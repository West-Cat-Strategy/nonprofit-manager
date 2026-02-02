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
  segmentId?: number;
  sendTime?: string;
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
  segments: MailchimpSegment[];
  syncResult: BulkSyncResponse | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
}
