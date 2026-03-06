import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  getPublicNewsletter,
  listPublicNewsletters,
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

const publicWebsiteFormParamsSchema = z.object({
  siteKey: siteKeySchema,
  formKey: z.string().trim().min(1).max(255),
});

const publicWebsiteFormBodySchema = z
  .object({
    name: z.string().trim().optional(),
    first_name: z.string().trim().optional(),
    last_name: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().optional(),
    message: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    amount: z.union([z.coerce.number().positive(), z.string().trim()]).optional(),
    recurring: z.coerce.boolean().optional(),
    availability: z.string().trim().optional(),
    skills: z.array(z.string().trim()).optional(),
  })
  .passthrough();

const newslettersRouter = Router();
newslettersRouter.get('/', validateQuery(publicNewsletterListQuerySchema), listPublicNewsletters);
newslettersRouter.get(
  '/:slug',
  validateParams(newsletterSlugParamsSchema),
  validateQuery(publicNewsletterDetailQuerySchema),
  getPublicNewsletter
);

const formsRouter = Router();
formsRouter.post(
  '/:siteKey/:formKey/submit',
  validateParams(publicWebsiteFormParamsSchema),
  validateBody(publicWebsiteFormBodySchema),
  submitPublicWebsiteForm
);

export const publicPublishingV2Routes = newslettersRouter;
export const publicWebsiteFormsV2Routes = formsRouter;
