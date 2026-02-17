/**
 * Mailchimp Routes
 * API endpoints for email marketing integration
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '@middleware/domains/auth';
import { validateRequest } from '@middleware/domains/security';
import * as mailchimpController from '@controllers/domains/engagement';

const router = Router();

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
router.get(
  '/lists/:id',
  authenticate,
  [param('id').isString().notEmpty().withMessage('List ID is required'), validateRequest],
  mailchimpController.getList
);

/**
 * GET /api/mailchimp/lists/:listId/tags
 * Get tags for a list
 */
router.get(
  '/lists/:listId/tags',
  authenticate,
  [param('listId').isString().notEmpty().withMessage('List ID is required'), validateRequest],
  mailchimpController.getListTags
);

/**
 * GET /api/mailchimp/lists/:listId/segments
 * Get segments for a list
 */
router.get(
  '/lists/:listId/segments',
  authenticate,
  [param('listId').isString().notEmpty().withMessage('List ID is required'), validateRequest],
  mailchimpController.getSegments
);

/**
 * POST /api/mailchimp/lists/:listId/segments
 * Create a segment in a list
 */
router.post(
  '/lists/:listId/segments',
  authenticate,
  [
    param('listId').isString().notEmpty().withMessage('List ID is required'),
    body('name').isString().notEmpty().withMessage('Segment name is required'),
    body('matchType').optional().isIn(['any', 'all']).withMessage('Match type must be "any" or "all"'),
    body('conditions').isArray({ min: 1 }).withMessage('At least one condition is required'),
    body('conditions.*.field').isString().notEmpty().withMessage('Condition field is required'),
    body('conditions.*.op')
      .isIn(['is', 'not', 'contains', 'notcontain', 'greater', 'less', 'blank', 'blank_not'])
      .withMessage('Invalid condition operator'),
    body('conditions.*.value').notEmpty().withMessage('Condition value is required'),
    validateRequest,
  ],
  mailchimpController.createSegment
);

/**
 * GET /api/mailchimp/lists/:listId/members/:email
 * Get a member from a list
 */
router.get(
  '/lists/:listId/members/:email',
  authenticate,
  [
    param('listId').isString().notEmpty().withMessage('List ID is required'),
    param('email').isEmail().withMessage('Valid email is required'),
    validateRequest,
  ],
  mailchimpController.getMember
);

/**
 * DELETE /api/mailchimp/lists/:listId/members/:email
 * Delete a member from a list
 */
router.delete(
  '/lists/:listId/members/:email',
  authenticate,
  [
    param('listId').isString().notEmpty().withMessage('List ID is required'),
    param('email').isEmail().withMessage('Valid email is required'),
    validateRequest,
  ],
  mailchimpController.deleteMember
);

/**
 * POST /api/mailchimp/members
 * Add or update a member in a list
 */
router.post(
  '/members',
  authenticate,
  [
    body('listId').isString().notEmpty().withMessage('List ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('status')
      .optional()
      .isIn(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'])
      .withMessage('Invalid member status'),
    body('mergeFields').optional().isObject().withMessage('Merge fields must be an object'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    validateRequest,
  ],
  mailchimpController.addMember
);

/**
 * POST /api/mailchimp/members/tags
 * Update member tags
 */
router.post(
  '/members/tags',
  authenticate,
  [
    body('listId').isString().notEmpty().withMessage('List ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('tagsToAdd').optional().isArray().withMessage('Tags to add must be an array'),
    body('tagsToRemove').optional().isArray().withMessage('Tags to remove must be an array'),
    validateRequest,
  ],
  mailchimpController.updateMemberTags
);

/**
 * POST /api/mailchimp/sync/contact
 * Sync a single contact to Mailchimp
 */
router.post(
  '/sync/contact',
  authenticate,
  [
    body('contactId').isUUID().withMessage('Valid contact ID is required'),
    body('listId').isString().notEmpty().withMessage('List ID is required'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    validateRequest,
  ],
  mailchimpController.syncContact
);

/**
 * POST /api/mailchimp/sync/bulk
 * Bulk sync contacts to Mailchimp
 */
router.post(
  '/sync/bulk',
  authenticate,
  [
    body('contactIds')
      .isArray({ min: 1, max: 500 })
      .withMessage('Contact IDs array is required (max 500)'),
    body('contactIds.*').isUUID().withMessage('All contact IDs must be valid UUIDs'),
    body('listId').isString().notEmpty().withMessage('List ID is required'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    validateRequest,
  ],
  mailchimpController.bulkSyncContacts
);

/**
 * GET /api/mailchimp/campaigns
 * Get campaigns
 */
router.get(
  '/campaigns',
  authenticate,
  [query('listId').optional().isString().withMessage('List ID must be a string'), validateRequest],
  mailchimpController.getCampaigns
);

/**
 * POST /api/mailchimp/campaigns
 * Create a new email campaign
 */
router.post(
  '/campaigns',
  authenticate,
  [
    body('listId').isString().notEmpty().withMessage('List ID is required'),
    body('title').isString().notEmpty().withMessage('Campaign title is required'),
    body('subject').isString().notEmpty().withMessage('Subject line is required'),
    body('fromName').isString().notEmpty().withMessage('From name is required'),
    body('replyTo').isEmail().withMessage('Valid reply-to email is required'),
    body('previewText').optional().isString().withMessage('Preview text must be a string'),
    body('htmlContent').optional().isString().withMessage('HTML content must be a string'),
    body('plainTextContent').optional().isString().withMessage('Plain text content must be a string'),
    body('segmentId').optional().isNumeric().withMessage('Segment ID must be a number'),
    body('sendTime').optional().isISO8601().withMessage('Send time must be a valid ISO 8601 date'),
    validateRequest,
  ],
  mailchimpController.createCampaign
);

/**
 * POST /api/mailchimp/campaigns/:campaignId/send
 * Send a campaign immediately
 */
router.post(
  '/campaigns/:campaignId/send',
  authenticate,
  [param('campaignId').isString().notEmpty().withMessage('Campaign ID is required'), validateRequest],
  mailchimpController.sendCampaign
);

/**
 * POST /api/mailchimp/webhook
 * Mailchimp webhook handler (no auth - Mailchimp sends webhooks)
 */
router.post('/webhook', mailchimpController.handleWebhook);

export default router;
