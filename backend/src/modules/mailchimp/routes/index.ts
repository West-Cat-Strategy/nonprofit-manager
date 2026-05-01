/**
 * Mailchimp Routes
 * API endpoints for email marketing integration
 */

import { createHash, timingSafeEqual } from 'crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import * as mailchimpController from '../controllers';
import { Permission } from '@utils/permissions';
import { emailSchema, isoDateTimeSchema, uuidSchema } from '@validations/shared';
import { unauthorized } from '@utils/responseHelpers';
import { logger } from '@config/logger';

const router = Router();

const listIdSchema = z.string().trim().min(1, 'List ID is required');

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

const campaignRunIdParamsSchema = z.object({
  runId: uuidSchema,
});

const audienceIdParamsSchema = z.object({
  audienceId: uuidSchema,
});

const savedAudienceFiltersSchema = z
  .object({
    source: z.literal('communications_selected_contacts'),
    contactIds: z.array(uuidSchema).min(1).max(500),
    listId: listIdSchema,
  })
  .strict();

const savedAudienceSchema = z
  .object({
    name: z.string().trim().min(1, 'Audience name is required').max(255),
    description: z.string().trim().max(4000).optional(),
    filters: savedAudienceFiltersSchema,
  })
  .strict();

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

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Accent color must be a valid hex value');

const emailBuilderBlockSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().trim().min(1).max(100),
    type: z.literal('heading'),
    content: z.string().min(1).max(500),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }),
  z.object({
    id: z.string().trim().min(1).max(100),
    type: z.literal('paragraph'),
    content: z.string().min(1).max(5000),
  }),
  z.object({
    id: z.string().trim().min(1).max(100),
    type: z.literal('button'),
    label: z.string().min(1).max(120),
    url: z.string().min(1).max(2048),
  }),
  z.object({
    id: z.string().trim().min(1).max(100),
    type: z.literal('image'),
    src: z.string().min(1).max(2048),
    alt: z.string().max(240).optional(),
    href: z.string().max(2048).optional(),
  }),
  z.object({
    id: z.string().trim().min(1).max(100),
    type: z.literal('divider'),
  }),
]);

const emailBuilderContentSchema = z.object({
  accentColor: hexColorSchema.optional(),
  footerText: z.string().max(4000).optional(),
  blocks: z.array(emailBuilderBlockSchema).max(50),
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

const campaignsQuerySchema = z
  .object({
    listId: z.string().optional(),
  })
  .strict();

const dateStringSchema = isoDateTimeSchema;

const getMailchimpWebhookSecret = (): string | undefined => {
  const secret = process.env.MAILCHIMP_WEBHOOK_SECRET?.trim();
  return secret ? secret : undefined;
};

const isMatchingSecret = (provided: unknown, expected: string): boolean => {
  if (typeof provided !== 'string') {
    return false;
  }

  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();

  return timingSafeEqual(providedHash, expectedHash);
};

const requireMailchimpWebhookSecret = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const expectedSecret = getMailchimpWebhookSecret();
  if (!expectedSecret) {
    logger.warn('MAILCHIMP_WEBHOOK_SECRET is not configured; Mailchimp webhook endpoint is unauthenticated');
    next();
    return;
  }

  if (!isMatchingSecret(req.query.secret, expectedSecret)) {
    unauthorized(res, 'Invalid Mailchimp webhook secret');
    return;
  }

  next();
};

const createCampaignSchema = z
  .object({
    listId: listIdSchema,
    title: z.string().min(1, 'Campaign title is required'),
    subject: z.string().min(1, 'Subject line is required'),
    fromName: z.string().min(1, 'From name is required'),
    replyTo: emailSchema,
    previewText: z.string().optional(),
    htmlContent: z.string().optional(),
    plainTextContent: z.string().optional(),
    builderContent: emailBuilderContentSchema.optional(),
    segmentId: z.coerce.number().optional(),
    sendTime: dateStringSchema.optional(),
    includeAudienceId: uuidSchema.optional(),
    exclusionAudienceIds: z.array(uuidSchema).max(50).optional(),
    priorRunSuppressionIds: z.array(uuidSchema).max(50).optional(),
    suppressionSnapshot: z.array(z.unknown()).max(1000).optional(),
    testRecipients: z.array(emailSchema).max(50).optional(),
    audienceSnapshot: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const campaignTestSendSchema = z
  .object({
    testRecipients: z.array(emailSchema).min(1).max(50),
    sendType: z.enum(['html', 'plain_text']).optional(),
  })
  .strict();

const draftCampaignTestSendSchema = createCampaignSchema
  .extend({
    testRecipients: z.array(emailSchema).min(1).max(50),
  })
  .strict();

/**
 * POST /api/mailchimp/webhook
 * Mailchimp webhook handler (no auth - Mailchimp sends webhooks)
 */
router.post('/webhook', requireMailchimpWebhookSecret, mailchimpController.handleWebhook);

router.use(authenticate, requirePermission(Permission.ADMIN_SETTINGS));

/**
 * GET /api/mailchimp/status
 * Get Mailchimp configuration status
 */
router.get('/status', mailchimpController.getStatus);

/**
 * GET /api/mailchimp/lists
 * Get all Mailchimp audiences/lists
 */
router.get('/lists', mailchimpController.getLists);

/**
 * GET /api/mailchimp/lists/:id
 * Get a specific list
 */
router.get(
  '/lists/:id',
  validateParams(listIdParamsSchema),
  mailchimpController.getList
);

/**
 * GET /api/mailchimp/lists/:listId/tags
 * Get tags for a list
 */
router.get(
  '/lists/:listId/tags',
  validateParams(listIdOnlyParamsSchema),
  mailchimpController.getListTags
);

/**
 * GET /api/mailchimp/lists/:listId/segments
 * Get segments for a list
 */
router.get(
  '/lists/:listId/segments',
  validateParams(listIdOnlyParamsSchema),
  mailchimpController.getSegments
);

router.get('/audiences', mailchimpController.getSavedAudiences);

router.post(
  '/audiences',
  validateBody(savedAudienceSchema),
  mailchimpController.createSavedAudience
);

router.patch(
  '/audiences/:audienceId/archive',
  validateParams(audienceIdParamsSchema),
  mailchimpController.archiveSavedAudience
);

/**
 * POST /api/mailchimp/lists/:listId/segments
 * Create a segment in a list
 */
router.post(
  '/lists/:listId/segments',
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
  validateParams(listMemberParamsSchema),
  mailchimpController.getMember
);

/**
 * DELETE /api/mailchimp/lists/:listId/members/:email
 * Delete a member from a list
 */
router.delete(
  '/lists/:listId/members/:email',
  validateParams(listMemberParamsSchema),
  mailchimpController.deleteMember
);

/**
 * POST /api/mailchimp/members
 * Add or update a member in a list
 */
router.post('/members', validateBody(addMemberSchema), mailchimpController.addMember);

/**
 * POST /api/mailchimp/members/tags
 * Update member tags
 */
router.post(
  '/members/tags',
  validateBody(updateMemberTagsSchema),
  mailchimpController.updateMemberTags
);

/**
 * POST /api/mailchimp/sync/contact
 * Sync a single contact to Mailchimp
 */
router.post(
  '/sync/contact',
  validateBody(syncContactSchema),
  mailchimpController.syncContact
);

/**
 * POST /api/mailchimp/sync/bulk
 * Bulk sync contacts to Mailchimp
 */
router.post(
  '/sync/bulk',
  validateBody(bulkSyncContactsSchema),
  mailchimpController.bulkSyncContacts
);

/**
 * GET /api/mailchimp/campaigns
 * Get campaigns
 */
router.get(
  '/campaigns',
  validateQuery(campaignsQuerySchema),
  mailchimpController.getCampaigns
);

router.get('/campaign-runs', mailchimpController.getCampaignRuns);

router.post(
  '/campaign-runs/:runId/send',
  validateParams(campaignRunIdParamsSchema),
  mailchimpController.sendCampaignRun
);

router.post(
  '/campaign-runs/:runId/status',
  validateParams(campaignRunIdParamsSchema),
  mailchimpController.refreshCampaignRunStatus
);

router.post(
  '/campaign-runs/:runId/cancel',
  validateParams(campaignRunIdParamsSchema),
  mailchimpController.cancelCampaignRun
);

router.post(
  '/campaign-runs/:runId/reschedule',
  validateParams(campaignRunIdParamsSchema),
  mailchimpController.rescheduleCampaignRun
);

/**
 * POST /api/mailchimp/campaigns/preview
 * Render a local preview for a campaign draft
 */
router.post(
  '/campaigns/preview',
  validateBody(createCampaignSchema),
  mailchimpController.previewCampaign
);

/**
 * POST /api/mailchimp/campaigns
 * Create a new email campaign
 */
router.post(
  '/campaigns',
  validateBody(createCampaignSchema),
  mailchimpController.createCampaign
);

router.post(
  '/campaigns/test-send',
  validateBody(draftCampaignTestSendSchema),
  mailchimpController.sendDraftCampaignTest
);

/**
 * POST /api/mailchimp/campaigns/:campaignId/send
 * Send a campaign immediately
 */
router.post(
  '/campaigns/:campaignId/send',
  validateParams(campaignIdParamsSchema),
  mailchimpController.sendCampaign
);

router.post(
  '/campaigns/:campaignId/test-send',
  validateParams(campaignIdParamsSchema),
  validateBody(campaignTestSendSchema),
  mailchimpController.sendCampaignTest
);

export default router;

export const createMailchimpRoutes = () => router;

export const mailchimpV2Routes = createMailchimpRoutes();
