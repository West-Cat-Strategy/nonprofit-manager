import { Router } from 'express';
import { z } from 'zod';
import { emailSchema, optionalStrictBooleanSchema } from '@validations/shared';
import {
  publicNewsletterConfirmationLimiterMiddleware,
  publicWebsiteActionLimiterMiddleware,
  publicWebsiteFormLimiterMiddleware,
} from '@middleware/domains/platform';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  getPublicContentEntry,
  getPublicNewsletter,
  listPublicContentEntries,
  listPublicNewsletters,
  confirmPublicNewsletterSignup,
  submitPublicAction,
  submitPublicWebsiteForm,
} from '../controllers';

const siteKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9.-]+$/i, 'site key must be a valid site identifier');

const newsletterSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/i, 'slug must be a valid path segment'),
});

const newsletterConfirmationParamsSchema = z.object({
  token: z.string().trim().min(1).max(512),
});

const publicNewsletterListQuerySchema = z
  .object({
    site: siteKeySchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    source: z.enum(['native', 'mailchimp', 'all']).optional(),
  })
  .strict();

const publicNewsletterDetailQuerySchema = z
  .object({
    site: siteKeySchema.optional(),
  })
  .strict();

const publicContentListQuerySchema = z
  .object({
    site: siteKeySchema.optional(),
    kind: z.enum(['blog_post', 'campaign_update']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    source: z.enum(['native', 'mailchimp', 'all']).optional(),
  })
  .strict();

const publicContentDetailQuerySchema = z
  .object({
    site: siteKeySchema.optional(),
    kind: z.enum(['blog_post', 'campaign_update']).optional(),
  })
  .strict();

const publicWebsiteFormParamsSchema = z.object({
  siteKey: siteKeySchema,
  formKey: z.string().trim().min(1).max(255),
});

const publicWebsiteFormBodySchema = z
  .object({
    first_name: z.string().trim().optional(),
    last_name: z.string().trim().optional(),
    email: emailSchema.optional(),
    phone: z.string().trim().optional(),
    message: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    subject: z.string().trim().optional(),
    referral_source: z.string().trim().optional(),
    urgent: optionalStrictBooleanSchema,
    amount: z.union([z.coerce.number().positive(), z.string().trim()]).optional(),
    recurring: optionalStrictBooleanSchema,
    availability: z.string().trim().optional(),
    visitorId: z.string().trim().optional(),
    sessionId: z.string().trim().optional(),
  })
  .strict();

const publicActionParamsSchema = z.object({
  siteKey: siteKeySchema,
  actionSlug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/i, 'action slug must be a valid path segment'),
});

const publicActionSubmissionBodySchema = z
  .object({
    first_name: z.string().trim().optional(),
    last_name: z.string().trim().optional(),
    email: emailSchema.optional(),
    phone: z.string().trim().optional(),
    amount: z.union([z.coerce.number().positive(), z.string().trim()]).optional(),
    message: z.string().trim().optional(),
    purpose: z.string().trim().optional(),
    schedule: z.enum(['one_time', 'monthly', 'quarterly', 'annual']).optional(),
    due_date: z.string().trim().optional(),
    consent: optionalStrictBooleanSchema,
    pagePath: z.string().trim().optional(),
    visitorId: z.string().trim().optional(),
    sessionId: z.string().trim().optional(),
  })
  .strict();

const newslettersRouter = Router();
newslettersRouter.get('/', validateQuery(publicNewsletterListQuerySchema), listPublicNewsletters);
newslettersRouter.get(
  '/confirm/:token',
  publicNewsletterConfirmationLimiterMiddleware,
  validateParams(newsletterConfirmationParamsSchema),
  confirmPublicNewsletterSignup
);
newslettersRouter.post(
  '/confirm/:token',
  publicNewsletterConfirmationLimiterMiddleware,
  validateParams(newsletterConfirmationParamsSchema),
  confirmPublicNewsletterSignup
);
newslettersRouter.get(
  '/:slug',
  validateParams(newsletterSlugParamsSchema),
  validateQuery(publicNewsletterDetailQuerySchema),
  getPublicNewsletter
);

const contentRouter = Router();
contentRouter.get('/', validateQuery(publicContentListQuerySchema), listPublicContentEntries);
contentRouter.get(
  '/:slug',
  validateParams(newsletterSlugParamsSchema),
  validateQuery(publicContentDetailQuerySchema),
  getPublicContentEntry
);

const formsRouter = Router();
formsRouter.post(
  '/:siteKey/:formKey/submit',
  publicWebsiteFormLimiterMiddleware,
  validateParams(publicWebsiteFormParamsSchema),
  validateBody(publicWebsiteFormBodySchema),
  submitPublicWebsiteForm
);

const actionsRouter = Router();
actionsRouter.post(
  '/:siteKey/:actionSlug/submissions',
  publicWebsiteActionLimiterMiddleware,
  validateParams(publicActionParamsSchema),
  validateBody(publicActionSubmissionBodySchema),
  submitPublicAction
);

export const publicPublishingV2Routes = newslettersRouter;
export const publicContentEntriesV2Routes = contentRouter;
export const publicWebsiteFormsV2Routes = formsRouter;
export const publicWebsiteActionsV2Routes = actionsRouter;
