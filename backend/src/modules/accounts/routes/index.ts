import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';
import { createAccountsController } from '../controllers/accounts.controller';
import { type ResponseMode } from '../mappers/responseMode';
import { AccountRepository } from '../repositories/accountRepository';
import { AccountCatalogUseCase } from '../usecases/accountCatalog.usecase';
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

const accountIdParamsSchema = z.object({
  id: uuidSchema,
});

const accountQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort_by: z.string().optional(),
  sort_order: sortOrderSchema.optional(),
  search: z.string().optional(),
  account_type: accountTypeSchema.optional(),
  category: accountCategorySchema.optional(),
  is_active: z.coerce.boolean().optional(),
}).strict();

const createAccountSchema = z.object({
  account_name: z.string().trim().min(1).max(255),
  account_type: accountTypeSchema,
  category: accountCategorySchema.optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
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
  website: z.string().trim().optional(),
  description: z.string().trim().optional(),
  address_line1: z.string().trim().optional(),
  address_line2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state_province: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().optional(),
  tax_id: z.string().trim().optional(),
  is_active: z.coerce.boolean().optional(),
});

export const createAccountsRoutes = (mode: ResponseMode = 'v2'): Router => {
  const router = Router();

  const repository = new AccountRepository();
  const controller = createAccountsController(
    new AccountCatalogUseCase(repository),
    new AccountLifecycleUseCase(repository),
    mode
  );

  router.use(authenticate);
  router.use(loadDataScope('accounts'));

  router.get('/', validateQuery(accountQuerySchema), controller.getAccounts);
  router.get('/:id', validateParams(accountIdParamsSchema), controller.getAccountById);
  router.get('/:id/contacts', validateParams(accountIdParamsSchema), controller.getAccountContacts);
  router.post('/', validateBody(createAccountSchema), controller.createAccount);
  router.put(
    '/:id',
    validateParams(accountIdParamsSchema),
    validateBody(updateAccountSchema),
    controller.updateAccount
  );
  router.delete('/:id', validateParams(accountIdParamsSchema), controller.deleteAccount);

  return router;
};

export const accountsV2Routes = createAccountsRoutes('v2');
