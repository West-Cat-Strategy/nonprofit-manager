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
  CreateSegmentRequest,
  MailchimpSegment,
  CreateCampaignRequest,
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

const CONTACT_SELECT_QUERY = `SELECT contact_id, first_name, last_name, email, phone,
        address_line1, address_line2, city, state_province, postal_code, country,
        do_not_email
 FROM contacts WHERE contact_id = $1`;

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

  try {
    const resolvedContent = resolveMailchimpCampaignContent(request);
    const campaign = await mailchimpClient.campaigns.create(buildCampaignCreatePayload(request));

    await mailchimpClient.campaigns.setContent(
      campaign.id,
      buildCampaignContentPayload(resolvedContent)
    );

    if (request.sendTime) {
      await mailchimpClient.campaigns.schedule(
        campaign.id,
        buildCampaignSchedulePayload(request.sendTime)
      );
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
  assertMailchimpConfigured('Mailchimp is not configured. Campaign cannot be sent.');

  try {
    await mailchimpClient.campaigns.send(campaignId);
    logger.info('Campaign sent', { campaignId });
  } catch (error) {
    logger.error('Failed to send campaign', { error, campaignId });
    throw error;
  }
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
  getCampaigns,
  createCampaign,
  sendCampaign,
  createSegment,
  getSegments,
};

export default mailchimpService;
