/**
 * Mailchimp Routes
 * API endpoints for email marketing integration
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import * as mailchimpController from '@controllers/domains/engagement';
import { uuidSchema } from '@validations/shared';

const router = Router();

const listIdSchema = z.string().trim().min(1, 'List ID is required');
const emailSchema = z.string().email('Valid email is required');

const listIdParamsSchema = z.object({
  id: listIdSchema,
});

const listIdOnlyParamsSchema = z.object({
  listId: listIdSchema,
});

const listMemberParamsSchema = z.object({
  listId: listIdSchema,
  email: emailSchema,
});

const campaignIdParamsSchema = z.object({
  campaignId: z.string().trim().min(1, 'Campaign ID is required'),
});

const segmentConditionSchema = z.object({
  field: z.string().min(1, 'Condition field is required'),
  op: z.enum(['is', 'not', 'contains', 'notcontain', 'greater', 'less', 'blank', 'blank_not']),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const createSegmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required'),
  matchType: z.enum(['any', 'all']).optional(),
  conditions: z.array(segmentConditionSchema).min(1, 'At least one condition is required'),
});

const addMemberSchema = z.object({
  listId: listIdSchema,
  email: emailSchema,
  status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional']).optional(),
  mergeFields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
});

const updateMemberTagsSchema = z.object({
  listId: listIdSchema,
  email: emailSchema,
  tagsToAdd: z.array(z.unknown()).optional(),
  tagsToRemove: z.array(z.unknown()).optional(),
});

const syncContactSchema = z.object({
  contactId: uuidSchema,
  listId: listIdSchema,
  tags: z.array(z.unknown()).optional(),
});

const bulkSyncContactsSchema = z.object({
  contactIds: z.array(uuidSchema).min(1).max(500),
  listId: listIdSchema,
  tags: z.array(z.unknown()).optional(),
});

const campaignsQuerySchema = z.object({
  listId: z.string().optional(),
});

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Send time must be a valid ISO 8601 date');

const createCampaignSchema = z.object({
  listId: listIdSchema,
  title: z.string().min(1, 'Campaign title is required'),
  subject: z.string().min(1, 'Subject line is required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: emailSchema,
  previewText: z.string().optional(),
  htmlContent: z.string().optional(),
  plainTextContent: z.string().optional(),
  segmentId: z.coerce.number().optional(),
  sendTime: dateStringSchema.optional(),
});

/**
 * GET /api/mailchimp/status
 * Get Mailchimp configuration status
 */
router.get('/status', authenticate, mailchimpController.getStatus);

/**
 * GET /api/mailchimp/lists
 * Get all Mailchimp audiences/lists
 */
router.get('/lists', authenticate, mailchimpController.getLists);

/**
 * GET /api/mailchimp/lists/:id
 * Get a specific list
 */
router.get('/lists/:id', authenticate, validateParams(listIdParamsSchema), mailchimpController.getList);

/**
 * GET /api/mailchimp/lists/:listId/tags
 * Get tags for a list
 */
router.get('/lists/:listId/tags', authenticate, validateParams(listIdOnlyParamsSchema), mailchimpController.getListTags);

/**
 * GET /api/mailchimp/lists/:listId/segments
 * Get segments for a list
 */
router.get('/lists/:listId/segments', authenticate, validateParams(listIdOnlyParamsSchema), mailchimpController.getSegments);

/**
 * POST /api/mailchimp/lists/:listId/segments
 * Create a segment in a list
 */
router.post(
  '/lists/:listId/segments',
  authenticate,
  validateParams(listIdOnlyParamsSchema),
  validateBody(createSegmentSchema),
  mailchimpController.createSegment
);

/**
 * GET /api/mailchimp/lists/:listId/members/:email
 * Get a member from a list
 */
router.get(
  '/lists/:listId/members/:email',
  authenticate,
  validateParams(listMemberParamsSchema),
  mailchimpController.getMember
);

/**
 * DELETE /api/mailchimp/lists/:listId/members/:email
 * Delete a member from a list
 */
router.delete(
  '/lists/:listId/members/:email',
  authenticate,
  validateParams(listMemberParamsSchema),
  mailchimpController.deleteMember
);

/**
 * POST /api/mailchimp/members
 * Add or update a member in a list
 */
router.post('/members', authenticate, validateBody(addMemberSchema), mailchimpController.addMember);

/**
 * POST /api/mailchimp/members/tags
 * Update member tags
 */
router.post('/members/tags', authenticate, validateBody(updateMemberTagsSchema), mailchimpController.updateMemberTags);

/**
 * POST /api/mailchimp/sync/contact
 * Sync a single contact to Mailchimp
 */
router.post('/sync/contact', authenticate, validateBody(syncContactSchema), mailchimpController.syncContact);

/**
 * POST /api/mailchimp/sync/bulk
 * Bulk sync contacts to Mailchimp
 */
router.post('/sync/bulk', authenticate, validateBody(bulkSyncContactsSchema), mailchimpController.bulkSyncContacts);

/**
 * GET /api/mailchimp/campaigns
 * Get campaigns
 */
router.get('/campaigns', authenticate, validateQuery(campaignsQuerySchema), mailchimpController.getCampaigns);

/**
 * POST /api/mailchimp/campaigns
 * Create a new email campaign
 */
router.post('/campaigns', authenticate, validateBody(createCampaignSchema), mailchimpController.createCampaign);

/**
 * POST /api/mailchimp/campaigns/:campaignId/send
 * Send a campaign immediately
 */
router.post(
  '/campaigns/:campaignId/send',
  authenticate,
  validateParams(campaignIdParamsSchema),
  mailchimpController.sendCampaign
);

/**
 * POST /api/mailchimp/webhook
 * Mailchimp webhook handler (no auth - Mailchimp sends webhooks)
 */
router.post('/webhook', mailchimpController.handleWebhook);

export default router;
