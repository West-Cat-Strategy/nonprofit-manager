import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { Permission } from '@utils/permissions';
import { emailSchema, isoDateTimeSchema, uuidSchema } from '@validations/shared';
import * as communicationsController from '../controllers';

const router = Router();
const publicRouter = Router();

const providerSchema = z.enum(['local_email', 'mailchimp']);
const listIdSchema = z.string().trim().min(1).optional();

const campaignRunIdParamsSchema = z.object({
  runId: uuidSchema,
});

const unsubscribeTokenParamsSchema = z.object({
  token: z.string(),
});

const providerAudienceParamsSchema = z.object({
  audienceId: z.string().trim().min(1),
});

const audiencesQuerySchema = z
  .object({
    scope: z.enum(['provider', 'saved']).optional().default('saved'),
  })
  .strict();

const campaignsQuerySchema = z
  .object({
    audienceId: z.string().trim().min(1).optional(),
  })
  .strict();

const campaignRunsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();

const recipientStatusSchema = z.enum(['queued', 'sending', 'sent', 'failed', 'suppressed', 'canceled']);

const campaignRunRecipientsQuerySchema = z
  .object({
    status: recipientStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();

const campaignRunRescheduleSchema = z
  .object({
    sendTime: isoDateTimeSchema,
  })
  .strict();

const savedAudienceParamsSchema = z.object({
  audienceId: uuidSchema,
});

const savedAudienceFiltersSchema = z
  .object({
    source: z.literal('communications_selected_contacts'),
    contactIds: z.array(uuidSchema).min(1).max(500),
    provider: providerSchema.optional(),
    listId: z.string().trim().min(1).optional(),
  })
  .strict();

const savedAudienceSchema = z
  .object({
    name: z.string().trim().min(1, 'Audience name is required').max(255),
    description: z.string().trim().max(4000).optional(),
    filters: savedAudienceFiltersSchema,
  })
  .strict();

const audiencePreviewSchema = z
  .object({
    contactIds: z.array(uuidSchema).max(500).optional(),
    includeAudienceId: uuidSchema.optional(),
    exclusionAudienceIds: z.array(uuidSchema).max(50).optional(),
    priorRunSuppressionIds: z.array(uuidSchema).max(50).optional(),
  })
  .strict();

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

const campaignSchema = z
  .object({
    provider: providerSchema.optional(),
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
    sendTime: isoDateTimeSchema.optional(),
    includeAudienceId: uuidSchema.optional(),
    exclusionAudienceIds: z.array(uuidSchema).max(50).optional(),
    priorRunSuppressionIds: z.array(uuidSchema).max(50).optional(),
    suppressionSnapshot: z.array(z.unknown()).max(1000).optional(),
    testRecipients: z.array(emailSchema).max(50).optional(),
    audienceSnapshot: z.record(z.string(), z.unknown()).optional(),
    contactIds: z.array(uuidSchema).max(500).optional(),
  })
  .strict();

const campaignTestSendSchema = campaignSchema
  .extend({
    testRecipients: z.array(emailSchema).min(1).max(50),
  })
  .strict();

router.use(authenticate, requirePermission(Permission.ADMIN_SETTINGS));

router.get('/status', communicationsController.getStatus);
router.get('/audiences', validateQuery(audiencesQuerySchema), communicationsController.getAudiences);
router.post('/audiences', validateBody(savedAudienceSchema), communicationsController.createAudience);
router.post(
  '/audiences/preview',
  validateBody(audiencePreviewSchema),
  communicationsController.previewAudience
);
router.get(
  '/audiences/:audienceId',
  validateParams(providerAudienceParamsSchema),
  communicationsController.getAudience
);
router.patch(
  '/audiences/:audienceId/archive',
  validateParams(savedAudienceParamsSchema),
  communicationsController.archiveAudience
);
router.get('/campaigns', validateQuery(campaignsQuerySchema), communicationsController.getCampaigns);
router.post(
  '/campaigns/preview',
  validateBody(campaignSchema),
  communicationsController.previewCampaign
);
router.post(
  '/campaigns/test-send',
  validateBody(campaignTestSendSchema),
  communicationsController.sendCampaignTest
);
router.post('/campaigns', validateBody(campaignSchema), communicationsController.createCampaign);
router.get(
  '/campaign-runs',
  validateQuery(campaignRunsQuerySchema),
  communicationsController.getCampaignRuns
);
router.get(
  '/campaign-runs/:runId/recipients',
  validateParams(campaignRunIdParamsSchema),
  validateQuery(campaignRunRecipientsQuerySchema),
  communicationsController.getCampaignRunRecipients
);
router.post(
  '/campaign-runs/:runId/send',
  validateParams(campaignRunIdParamsSchema),
  communicationsController.sendCampaignRun
);
router.post(
  '/campaign-runs/:runId/status',
  validateParams(campaignRunIdParamsSchema),
  communicationsController.refreshCampaignRunStatus
);
router.post(
  '/campaign-runs/:runId/cancel',
  validateParams(campaignRunIdParamsSchema),
  communicationsController.cancelCampaignRun
);
router.post(
  '/campaign-runs/:runId/reschedule',
  validateParams(campaignRunIdParamsSchema),
  validateBody(campaignRunRescheduleSchema),
  communicationsController.rescheduleCampaignRun
);

publicRouter.get(
  '/view/:token',
  validateParams(unsubscribeTokenParamsSchema),
  communicationsController.getBrowserView
);
publicRouter.get(
  '/unsubscribe/:token',
  validateParams(unsubscribeTokenParamsSchema),
  communicationsController.getUnsubscribe
);
publicRouter.post(
  '/unsubscribe/:token',
  validateParams(unsubscribeTokenParamsSchema),
  communicationsController.postUnsubscribe
);

export default router;

export const createCommunicationsRoutes = () => router;
export const createPublicCommunicationsRoutes = () => publicRouter;

export const communicationsV2Routes = createCommunicationsRoutes();
export const publicCommunicationsV2Routes = createPublicCommunicationsRoutes();
