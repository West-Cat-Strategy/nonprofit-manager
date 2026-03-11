/**
 * User Management Routes
 * Admin-only routes for managing users
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  getRoles,
} from '../controllers';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  emailSchema,
  optionalStrictBooleanSchema,
  passwordSchema,
  uuidSchema,
} from '@validations/shared';

const router = Router();

const userIdParamsSchema = z.object({
  id: uuidSchema,
});

const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'user', 'readonly']).optional(),
});

const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z.string().trim().min(1, 'First name cannot be empty').optional(),
  lastName: z.string().trim().min(1, 'Last name cannot be empty').optional(),
  role: z.enum(['admin', 'manager', 'user', 'readonly']).optional(),
  isActive: optionalStrictBooleanSchema,
});

const resetUserPasswordSchema = z.object({
  password: passwordSchema,
});

const listUsersQuerySchema = z
  .object({
    search: z.string().trim().max(255).optional(),
    role: z.enum(['admin', 'manager', 'user', 'readonly']).optional(),
    is_active: optionalStrictBooleanSchema,
  })
  .strict();

// All routes require authentication
router.use(authenticate);

// Get available roles
router.get('/roles', getRoles);

// List all users
router.get('/', validateQuery(listUsersQuerySchema), listUsers);

// Get a single user
router.get('/:id', validateParams(userIdParamsSchema), getUser);

// Create a new user
router.post('/', validateBody(createUserSchema), createUser);

// Update a user
router.put('/:id', validateParams(userIdParamsSchema), validateBody(updateUserSchema), updateUser);

// Reset user password
router.put(
  '/:id/password',
  validateParams(userIdParamsSchema),
  validateBody(resetUserPasswordSchema),
  resetUserPassword
);

// Delete (deactivate) a user
router.delete('/:id', validateParams(userIdParamsSchema), deleteUser);

export default router;

export type ResponseMode = 'v2' | 'legacy';

export const createUsersRoutes = (_mode: ResponseMode = 'v2') => router;

export const usersV2Routes = createUsersRoutes('v2');
