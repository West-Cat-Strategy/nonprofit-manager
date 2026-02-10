/**
 * Mailchimp Service
 * Handles email marketing integration with Mailchimp
 */

import mailchimp from '@mailchimp/mailchimp_marketing';
import crypto from 'crypto';
import { logger } from '../config/logger';
import pool from '../config/database';
import type {
  MailchimpStatus,
  MailchimpList,
  MailchimpMember,
  MailchimpMemberStatus,
  AddMemberRequest,
  SyncContactRequest,
  BulkSyncRequest,
  BulkSyncResponse,
  SyncResult,
  MailchimpTag,
  UpdateTagsRequest,
  MailchimpCampaign,
  CreateSegmentRequest,
  MailchimpSegment,
  CreateCampaignRequest,
} from '../types/mailchimp';

// Note: @mailchimp/mailchimp_marketing has incomplete TypeScript definitions.
// We use 'any' here because the library's types don't expose the actual API methods
// (ping, lists, campaigns, etc.) that are available at runtime.
const mailchimpClient = mailchimp as any;

// Mailchimp configuration
const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
const mailchimpServerPrefix = process.env.MAILCHIMP_SERVER_PREFIX;

let isConfigured = false;

/**
 * Initialize Mailchimp client
 */
function initializeMailchimp(): void {
  if (!mailchimpApiKey || !mailchimpServerPrefix) {
    // In tests we intentionally run without external integrations configured.
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('Mailchimp is not configured. Set MAILCHIMP_API_KEY and MAILCHIMP_SERVER_PREFIX.');
    }
    return;
  }

  mailchimp.setConfig({
    apiKey: mailchimpApiKey,
    server: mailchimpServerPrefix,
  });

  isConfigured = true;
  logger.info('Mailchimp client initialized');
}

// Initialize on module load
initializeMailchimp();

/**
 * Check if Mailchimp is configured
 */
export function isMailchimpConfigured(): boolean {
  return isConfigured;
}

/**
 * Get MD5 hash of email for Mailchimp subscriber lookup
 */
function getSubscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
}

/**
 * Get Mailchimp account status and basic info
 */
export async function getStatus(): Promise<MailchimpStatus> {
  if (!isConfigured) {
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
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    const response = await mailchimpClient.lists.getAllLists({
      count: 100,
      fields: ['lists.id', 'lists.name', 'lists.stats.member_count', 'lists.date_created', 'lists.double_optin'],
    });

    return response.lists.map((list: {
      id: string;
      name: string;
      stats: { member_count: number };
      date_created: string;
      double_optin: boolean;
    }) => ({
      id: list.id,
      name: list.name,
      memberCount: list.stats.member_count,
      createdAt: new Date(list.date_created),
      doubleOptIn: list.double_optin,
    }));
  } catch (error) {
    logger.error('Failed to get Mailchimp lists', { error });
    throw error;
  }
}

/**
 * Get a specific list by ID
 */
export async function getList(listId: string): Promise<MailchimpList> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    const list = await mailchimpClient.lists.getList(listId);

    return {
      id: list.id,
      name: list.name,
      memberCount: list.stats.member_count,
      createdAt: new Date(list.date_created),
      doubleOptIn: list.double_optin,
    };
  } catch (error) {
    logger.error('Failed to get Mailchimp list', { error, listId });
    throw error;
  }
}

/**
 * Add or update a member in a Mailchimp list
 */
export async function addOrUpdateMember(request: AddMemberRequest): Promise<MailchimpMember> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  const subscriberHash = getSubscriberHash(request.email);

  try {
    // Use setListMember for upsert behavior
    const response = await mailchimpClient.lists.setListMember(request.listId, subscriberHash, {
      email_address: request.email,
      status_if_new: request.status || 'subscribed',
      merge_fields: request.mergeFields || {},
    });

    // Add tags if provided
    if (request.tags && request.tags.length > 0) {
      await mailchimpClient.lists.updateListMemberTags(request.listId, subscriberHash, {
        tags: request.tags.map((tag) => ({ name: tag, status: 'active' })),
      });
    }

    logger.info('Member added/updated in Mailchimp', {
      listId: request.listId,
      email: request.email,
    });

    return {
      id: response.id,
      emailAddress: response.email_address,
      status: response.status as MailchimpMemberStatus,
      mergeFields: response.merge_fields,
      tags: response.tags?.map((t: { name: string }) => t.name) || [],
      listId: response.list_id,
      createdAt: new Date(response.timestamp_signup || response.timestamp_opt),
      lastChanged: new Date(response.last_changed),
    };
  } catch (error) {
    logger.error('Failed to add/update Mailchimp member', { error, request });
    throw error;
  }
}

/**
 * Get a member from a Mailchimp list
 */
export async function getMember(listId: string, email: string): Promise<MailchimpMember | null> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  const subscriberHash = getSubscriberHash(email);

  try {
    const response = await mailchimpClient.lists.getListMember(listId, subscriberHash);

    return {
      id: response.id,
      emailAddress: response.email_address,
      status: response.status as MailchimpMemberStatus,
      mergeFields: response.merge_fields,
      tags: response.tags?.map((t: { name: string }) => t.name) || [],
      listId: response.list_id,
      createdAt: new Date(response.timestamp_signup || response.timestamp_opt),
      lastChanged: new Date(response.last_changed),
    };
  } catch (error: unknown) {
    // Member not found returns 404
    if ((error as { status?: number }).status === 404) {
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
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
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
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    // Get contact from database
    const result = await pool.query(
      `SELECT contact_id, first_name, last_name, email, phone,
              address_line1, address_line2, city, state_province, postal_code, country,
              do_not_email
       FROM contacts WHERE contact_id = $1`,
      [request.contactId]
    );

    if (result.rows.length === 0) {
      return {
        contactId: request.contactId,
        email: '',
        success: false,
        action: 'skipped',
        error: 'Contact not found',
      };
    }

    const contact = result.rows[0];

    // Skip if no email or do_not_email is set
    if (!contact.email) {
      return {
        contactId: request.contactId,
        email: '',
        success: false,
        action: 'skipped',
        error: 'Contact has no email address',
      };
    }

    if (contact.do_not_email) {
      return {
        contactId: request.contactId,
        email: contact.email,
        success: false,
        action: 'skipped',
        error: 'Contact has do_not_email flag set',
      };
    }

    // Check if member already exists
    const existingMember = await getMember(request.listId, contact.email);
    const action = existingMember ? 'updated' : 'added';

    // Sync to Mailchimp
    await addOrUpdateMember({
      listId: request.listId,
      email: contact.email,
      status: 'subscribed',
      mergeFields: {
        FNAME: contact.first_name || '',
        LNAME: contact.last_name || '',
        PHONE: contact.phone || '',
        ADDRESS: {
          addr1: contact.address_line1 || '',
          addr2: contact.address_line2 || '',
          city: contact.city || '',
          state: contact.state_province || '',
          zip: contact.postal_code || '',
          country: contact.country || 'US',
        },
      },
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
    return {
      contactId: request.contactId,
      email: '',
      success: false,
      action: 'skipped',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk sync contacts to Mailchimp
 */
export async function bulkSyncContacts(request: BulkSyncRequest): Promise<BulkSyncResponse> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  const results: SyncResult[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const contactId of request.contactIds) {
    const result = await syncContact({
      contactId,
      listId: request.listId,
      tags: request.tags,
    });

    results.push(result);

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
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  const subscriberHash = getSubscriberHash(request.email);

  try {
    const tags: Array<{ name: string; status: 'active' | 'inactive' }> = [];

    if (request.tagsToAdd) {
      tags.push(...request.tagsToAdd.map((name) => ({ name, status: 'active' as const })));
    }

    if (request.tagsToRemove) {
      tags.push(...request.tagsToRemove.map((name) => ({ name, status: 'inactive' as const })));
    }

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
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    const response = await mailchimpClient.lists.listSegments(listId, {
      type: 'static',
      count: 100,
    });

    return response.segments.map((segment: {
      id: number;
      name: string;
      member_count: number;
    }) => ({
      id: segment.id,
      name: segment.name,
      memberCount: segment.member_count,
    }));
  } catch (error) {
    logger.error('Failed to get list tags', { error, listId });
    throw error;
  }
}

/**
 * Get campaigns
 */
export async function getCampaigns(listId?: string): Promise<MailchimpCampaign[]> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    const options: { count: number; list_id?: string } = { count: 50 };
    if (listId) {
      options.list_id = listId;
    }

    const response = await mailchimpClient.campaigns.list(options);

    return response.campaigns.map((campaign: {
      id: string;
      type: string;
      status: string;
      settings: { title: string; subject_line: string };
      recipients: { list_id: string };
      create_time: string;
      send_time: string;
      emails_sent: number;
      report_summary?: {
        opens: number;
        unique_opens: number;
        open_rate: number;
        clicks: number;
        subscriber_clicks: number;
        click_rate: number;
      };
    }) => ({
      id: campaign.id,
      type: campaign.type as MailchimpCampaign['type'],
      status: campaign.status as MailchimpCampaign['status'],
      title: campaign.settings.title,
      subject: campaign.settings.subject_line,
      listId: campaign.recipients.list_id,
      createdAt: new Date(campaign.create_time),
      sendTime: campaign.send_time ? new Date(campaign.send_time) : undefined,
      emailsSent: campaign.emails_sent,
      reportSummary: campaign.report_summary ? {
        opens: campaign.report_summary.opens,
        uniqueOpens: campaign.report_summary.unique_opens,
        openRate: campaign.report_summary.open_rate,
        clicks: campaign.report_summary.clicks,
        uniqueClicks: campaign.report_summary.subscriber_clicks,
        clickRate: campaign.report_summary.click_rate,
        unsubscribes: 0, // Not available in all responses
      } : undefined,
    }));
  } catch (error) {
    logger.error('Failed to get campaigns', { error, listId });
    throw error;
  }
}

/**
 * Create a segment in a list
 */
export async function createSegment(request: CreateSegmentRequest): Promise<MailchimpSegment> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    const response = await mailchimpClient.lists.createSegment(request.listId, {
      name: request.name,
      options: {
        match: request.matchType,
        conditions: request.conditions.map((c) => ({
          condition_type: 'TextMerge',
          field: c.field,
          op: c.op,
          value: String(c.value),
        })),
      },
    });

    logger.info('Segment created', { listId: request.listId, segmentId: response.id });

    return {
      id: response.id,
      name: response.name,
      memberCount: response.member_count,
      listId: response.list_id,
      createdAt: new Date(response.created_at),
      updatedAt: new Date(response.updated_at),
    };
  } catch (error) {
    logger.error('Failed to create segment', { error, request });
    throw error;
  }
}

/**
 * Get segments for a list
 */
export async function getSegments(listId: string): Promise<MailchimpSegment[]> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    const response = await mailchimpClient.lists.listSegments(listId, {
      count: 100,
    });

    return response.segments.map((segment: {
      id: number;
      name: string;
      member_count: number;
      list_id: string;
      created_at: string;
      updated_at: string;
    }) => ({
      id: segment.id,
      name: segment.name,
      memberCount: segment.member_count,
      listId: segment.list_id,
      createdAt: new Date(segment.created_at),
      updatedAt: new Date(segment.updated_at),
    }));
  } catch (error) {
    logger.error('Failed to get segments', { error, listId });
    throw error;
  }
}

/**
 * Create a new email campaign
 */
export async function createCampaign(request: CreateCampaignRequest): Promise<MailchimpCampaign> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    // Create campaign
    const campaignData: {
      type: 'regular';
      recipients: { list_id: string; segment_opts?: { saved_segment_id: number } };
      settings: {
        subject_line: string;
        preview_text?: string;
        title: string;
        from_name: string;
        reply_to: string;
      };
    } = {
      type: 'regular',
      recipients: {
        list_id: request.listId,
      },
      settings: {
        subject_line: request.subject,
        preview_text: request.previewText,
        title: request.title,
        from_name: request.fromName,
        reply_to: request.replyTo,
      },
    };

    // Add segment if specified
    if (request.segmentId) {
      campaignData.recipients.segment_opts = {
        saved_segment_id: request.segmentId,
      };
    }

    const campaign = await mailchimpClient.campaigns.create(campaignData);

    // Set campaign content if provided
    if (request.htmlContent || request.plainTextContent) {
      const contentData: {
        html?: string;
        plain_text?: string;
      } = {};

      if (request.htmlContent) {
        contentData.html = request.htmlContent;
      }
      if (request.plainTextContent) {
        contentData.plain_text = request.plainTextContent;
      }

      await mailchimpClient.campaigns.setContent(campaign.id, contentData);
    }

    // Schedule campaign if send time is provided
    if (request.sendTime) {
      await mailchimpClient.campaigns.schedule(campaign.id, {
        schedule_time: request.sendTime.toISOString(),
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
    logger.error('Failed to create campaign', { error, request });
    throw error;
  }
}

/**
 * Send a campaign immediately
 */
export async function sendCampaign(campaignId: string): Promise<void> {
  if (!isConfigured) {
    throw new Error('Mailchimp is not configured');
  }

  try {
    await mailchimpClient.campaigns.send(campaignId);
    logger.info('Campaign sent', { campaignId });
  } catch (error) {
    logger.error('Failed to send campaign', { error, campaignId });
    throw error;
  }
}

export default {
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
  getCampaigns,
  createCampaign,
  sendCampaign,
  createSegment,
  getSegments,
};
