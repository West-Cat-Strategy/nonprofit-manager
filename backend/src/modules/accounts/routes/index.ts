import { Router } from 'express';
import { z } from 'zod';
import pool from '@config/database';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import { requireAdmin } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema, optionalStrictBooleanSchema } from '@validations/shared';
import { createAccountsController } from '../controllers/accounts.controller';
import { AccountRepository } from '../repositories/accountRepository';
import { AccountCatalogUseCase } from '../usecases/accountCatalog.usecase';
import { AccountImportExportUseCase } from '../usecases/accountImportExport.usecase';
import { AccountLifecycleUseCase } from '../usecases/accountLifecycle.usecase';

const accountTypeSchema = z.enum(['organization', 'individual']);
const accountCategorySchema = z.enum([
  'donor',
  'volunteer',
  'partner',
  'vendor',
  'beneficiary',
  'other',
]);
const sortOrderSchema = z.enum(['asc', 'desc']);
const websiteUrlSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Website must be a valid http:// or https:// URL')
  .optional());

const accountIdParamsSchema = z.object({
  id: uuidSchema,
});

const accountQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort_by: z.string().optional(),
    sort_order: sortOrderSchema.optional(),
    search: z.string().optional(),
    account_type: accountTypeSchema.optional(),
    category: accountCategorySchema.optional(),
    is_active: optionalStrictBooleanSchema,
  })
  .strict();

const createAccountSchema = z.object({
  account_name: z.string().trim().min(1).max(255),
  account_type: accountTypeSchema,
  category: accountCategorySchema.optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: websiteUrlSchema,
  description: z.string().trim().optional(),
  address_line1: z.string().trim().optional(),
  address_line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state_province: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
});

const updateAccountSchema = z.object({
  account_name: z.string().trim().min(1).max(255).optional(),
  account_type: accountTypeSchema.optional(),
  category: accountCategorySchema.optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: websiteUrlSchema,
  description: z.string().trim().optional(),
  address_line1: z.string().trim().optional(),
  address_line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state_province: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  is_active: optionalStrictBooleanSchema,
});

const accountExportSchema = z
  .object({
    format: z.enum(['csv', 'xlsx']),
    ids: z.array(uuidSchema).optional(),
    columns: z.array(z.string().trim().min(1)).optional(),
    sort_by: z.string().optional(),
    sort_order: sortOrderSchema.optional(),
    search: z.string().optional(),
    account_type: accountTypeSchema.optional(),
    category: accountCategorySchema.optional(),
    is_active: optionalStrictBooleanSchema,
  })
  .strict();

const accountImportTemplateQuerySchema = z
  .object({
    format: z
      .enum(['csv', 'xlsx', 'xslx'])
      .transform((value) => (value === 'xslx' ? 'xlsx' : value))
      .optional(),
  })
  .strict();

export const createAccountsRoutes = (): Router => {
  const router = Router();

  const repository = new AccountRepository();
  const controller = createAccountsController(
    new AccountCatalogUseCase(repository),
    new AccountLifecycleUseCase(repository),
    new AccountImportExportUseCase(pool)
  );

  router.use(authenticate);
  router.use(loadDataScope('accounts'));

  router.get('/', validateQuery(accountQuerySchema), controller.getAccounts);
  router.post('/export', validateBody(accountExportSchema), controller.exportAccounts);
  router.get(
    '/import/template',
    validateQuery(accountImportTemplateQuerySchema),
    controller.downloadImportTemplate
  );
  router.post(
    '/import/preview',
    documentUpload.single('file'),
    handleMulterError,
    controller.previewImport
  );
  router.post(
    '/import/commit',
    documentUpload.single('file'),
    handleMulterError,
    requireAdmin,
    controller.commitImport
  );
  router.get('/:id', validateParams(accountIdParamsSchema), controller.getAccountById);
  router.get('/:id/contacts', validateParams(accountIdParamsSchema), controller.getAccountContacts);
  router.post(
    '/',
    validateBody(createAccountSchema),
    requireAdmin,
    controller.createAccount
  );
  router.put(
    '/:id',
    validateParams(accountIdParamsSchema),
    validateBody(updateAccountSchema),
    requireAdmin,
    controller.updateAccount
  );
  router.delete(
    '/:id',
    validateParams(accountIdParamsSchema),
    requireAdmin,
    controller.deleteAccount
  );

  return router;
};

export const accountsV2Routes = createAccountsRoutes();
