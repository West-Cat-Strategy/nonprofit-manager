/**
 * Mailchimp Controller
 * HTTP handlers for email marketing operations
 */

import { Request, Response } from 'express';
import { logger } from '@config/logger';
import { mailchimpService } from '@services/domains/integration';
import type { AuthRequest } from '@middleware/auth';
import type {
  SyncContactRequest,
  BulkSyncRequest,
  UpdateTagsRequest,
  CreateSegmentRequest,
  AddMemberRequest,
  MailchimpWebhookPayload,
  CreateCampaignRequest,
} from '@app-types/mailchimp';
import { badRequest, notFoundMessage, serverError, serviceUnavailable } from '@utils/responseHelpers';

/**
 * Get Mailchimp configuration status
 */
export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await mailchimpService.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting Mailchimp status', { error });
    serverError(res, 'Failed to get Mailchimp status');
  }
};

/**
 * Get all Mailchimp lists/audiences
 */
export const getLists = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const lists = await mailchimpService.getLists();
    res.json(lists);
  } catch (error) {
    logger.error('Error getting Mailchimp lists', { error });
    serverError(res, 'Failed to get Mailchimp lists');
  }
};

/**
 * Get a specific list by ID
 */
export const getList = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const list = await mailchimpService.getList(id);
    res.json(list);
  } catch (error) {
    logger.error('Error getting Mailchimp list', { error });
    serverError(res, 'Failed to get Mailchimp list');
  }
};

/**
 * Add or update a member in a list
 */
export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { listId, email, status, mergeFields, tags } = req.body as AddMemberRequest;

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!email) {
      badRequest(res, 'Email is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const member = await mailchimpService.addOrUpdateMember({
      listId,
      email,
      status,
      mergeFields,
      tags,
    });

    res.status(201).json(member);
  } catch (error) {
    logger.error('Error adding Mailchimp member', { error });
    serverError(res, 'Failed to add member to Mailchimp');
  }
};

/**
 * Get a member from a list
 */
export const getMember = async (
  req: Request<{ listId: string; email: string }>,
  res: Response
): Promise<void> => {
  try {
    const { listId, email } = req.params;

    if (!listId || !email) {
      badRequest(res, 'List ID and email are required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const member = await mailchimpService.getMember(listId, email);

    if (!member) {
      notFoundMessage(res, 'Member not found');
      return;
    }

    res.json(member);
  } catch (error) {
    logger.error('Error getting Mailchimp member', { error });
    serverError(res, 'Failed to get Mailchimp member');
  }
};

/**
 * Delete a member from a list
 */
export const deleteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { listId, email } = req.params;

    if (!listId || !email) {
      badRequest(res, 'List ID and email are required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    await mailchimpService.deleteMember(listId, email);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting Mailchimp member', { error });
    serverError(res, 'Failed to delete Mailchimp member');
  }
};

/**
 * Sync a single contact to Mailchimp
 */
export const syncContact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contactId, listId, tags } = req.body as SyncContactRequest;

    if (!contactId) {
      badRequest(res, 'Contact ID is required');
      return;
    }

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const result = await mailchimpService.syncContact({ contactId, listId, tags });

    if (result.success) {
      res.json(result);
    } else {
      badRequest(res, result.error || 'Failed to sync contact to Mailchimp', {
        contactId: result.contactId,
        action: result.action,
      });
    }
  } catch (error) {
    logger.error('Error syncing contact to Mailchimp', { error });
    serverError(res, 'Failed to sync contact to Mailchimp');
  }
};

/**
 * Bulk sync contacts to Mailchimp
 */
export const bulkSyncContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contactIds, listId, tags } = req.body as BulkSyncRequest;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      badRequest(res, 'Contact IDs array is required and must not be empty');
      return;
    }

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    // Limit bulk sync to 500 contacts at a time
    if (contactIds.length > 500) {
      badRequest(res, 'Maximum 500 contacts can be synced at once');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const result = await mailchimpService.bulkSyncContacts({ contactIds, listId, tags });
    res.json(result);
  } catch (error) {
    logger.error('Error bulk syncing contacts to Mailchimp', { error });
    serverError(res, 'Failed to bulk sync contacts to Mailchimp');
  }
};

/**
 * Update member tags
 */
export const updateMemberTags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { listId, email, tagsToAdd, tagsToRemove } = req.body as UpdateTagsRequest;

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!email) {
      badRequest(res, 'Email is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    await mailchimpService.updateMemberTags({ listId, email, tagsToAdd, tagsToRemove });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating member tags', { error });
    serverError(res, 'Failed to update member tags');
  }
};

/**
 * Get list tags
 */
export const getListTags = async (req: Request<{ listId: string }>, res: Response): Promise<void> => {
  try {
    const { listId } = req.params;

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const tags = await mailchimpService.getListTags(listId);
    res.json(tags);
  } catch (error) {
    logger.error('Error getting list tags', { error });
    serverError(res, 'Failed to get list tags');
  }
};

/**
 * Get campaigns
 */
export const getCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listId } = req.query;

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const campaigns = await mailchimpService.getCampaigns(listId as string | undefined);
    res.json(campaigns);
  } catch (error) {
    logger.error('Error getting campaigns', { error });
    serverError(res, 'Failed to get campaigns');
  }
};

/**
 * Create a segment
 */
export const createSegment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { listId, name, matchType, conditions } = req.body as CreateSegmentRequest;

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!name) {
      badRequest(res, 'Segment name is required');
      return;
    }

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      badRequest(res, 'Segment conditions are required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const segment = await mailchimpService.createSegment({
      listId,
      name,
      matchType: matchType || 'all',
      conditions,
    });

    res.status(201).json(segment);
  } catch (error) {
    logger.error('Error creating segment', { error });
    serverError(res, 'Failed to create segment');
  }
};

/**
 * Get segments for a list
 */
export const getSegments = async (req: Request<{ listId: string }>, res: Response): Promise<void> => {
  try {
    const { listId } = req.params;

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const segments = await mailchimpService.getSegments(listId);
    res.json(segments);
  } catch (error) {
    logger.error('Error getting segments', { error });
    serverError(res, 'Failed to get segments');
  }
};

/**
 * Create a new email campaign
 */
export const createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      listId,
      title,
      subject,
      previewText,
      fromName,
      replyTo,
      htmlContent,
      plainTextContent,
      segmentId,
      sendTime,
    } = req.body as CreateCampaignRequest;

    if (!listId) {
      badRequest(res, 'List ID is required');
      return;
    }

    if (!title) {
      badRequest(res, 'Campaign title is required');
      return;
    }

    if (!subject) {
      badRequest(res, 'Subject line is required');
      return;
    }

    if (!fromName) {
      badRequest(res, 'From name is required');
      return;
    }

    if (!replyTo) {
      badRequest(res, 'Reply-to email is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    const campaign = await mailchimpService.createCampaign({
      listId,
      title,
      subject,
      previewText,
      fromName,
      replyTo,
      htmlContent,
      plainTextContent,
      segmentId,
      sendTime: sendTime ? new Date(sendTime) : undefined,
    });

    res.status(201).json(campaign);
  } catch (error) {
    logger.error('Error creating campaign', { error });
    serverError(res, 'Failed to create campaign');
  }
};

/**
 * Send a campaign immediately
 */
export const sendCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      badRequest(res, 'Campaign ID is required');
      return;
    }

    if (!mailchimpService.isMailchimpConfigured()) {
      serviceUnavailable(res, 'Mailchimp is not configured');
      return;
    }

    await mailchimpService.sendCampaign(campaignId);
    res.json({ success: true, message: 'Campaign sent successfully' });
  } catch (error) {
    logger.error('Error sending campaign', { error });
    serverError(res, 'Failed to send campaign');
  }
};

/**
 * Handle Mailchimp webhook
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Mailchimp sends webhook data as form data
    const payload = req.body as MailchimpWebhookPayload;

    logger.info('Mailchimp webhook received', {
      type: payload.type,
      listId: payload.data?.listId,
      email: payload.data?.email,
    });

    // Handle different webhook event types
    switch (payload.type) {
      case 'subscribe':
        logger.info('New subscriber', {
          email: payload.data.email,
          listId: payload.data.listId,
        });
        // Could sync back to contacts table if needed
        break;

      case 'unsubscribe':
        logger.info('Unsubscribe', {
          email: payload.data.email,
          listId: payload.data.listId,
        });
        // Could update contact's do_not_email flag
        break;

      case 'profile':
        logger.info('Profile update', {
          email: payload.data.email,
          listId: payload.data.listId,
        });
        // Could sync profile changes back to contacts
        break;

      case 'upemail':
        logger.info('Email address changed', {
          oldEmail: payload.data.oldEmail,
          newEmail: payload.data.newEmail,
          listId: payload.data.listId,
        });
        // Could update contact email if needed
        break;

      case 'cleaned':
        logger.info('Email cleaned (bounced/invalid)', {
          email: payload.data.email,
          listId: payload.data.listId,
          reason: payload.data.reason,
        });
        // Could mark contact email as invalid
        break;

      case 'campaign':
        logger.info('Campaign event', {
          listId: payload.data.listId,
        });
        break;

      default:
        logger.debug('Unhandled Mailchimp webhook type', { type: payload.type });
    }

    // Always return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    logger.error('Mailchimp webhook error', { error });
    // Still return 200 to prevent Mailchimp from retrying
    res.json({ received: true, error: 'Processing error' });
  }
};

export default {
  getStatus,
  getLists,
  getList,
  addMember,
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
  handleWebhook,
};
