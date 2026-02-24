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
} from '@controllers/domains/core';
import { authenticate } from '@middleware/domains/auth';
import { validateBody, validateParams } from '@middleware/zodValidation';
import { emailSchema, uuidSchema } from '@validations/shared';

const router = Router();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  );

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
  isActive: z.coerce.boolean().optional(),
});

const resetUserPasswordSchema = z.object({
  password: passwordSchema,
});

// All routes require authentication
router.use(authenticate);

// Get available roles
router.get('/roles', getRoles);

// List all users
router.get('/', listUsers);

// Get a single user
router.get('/:id', validateParams(userIdParamsSchema), getUser);

// Create a new user
router.post('/', validateBody(createUserSchema), createUser);

// Update a user
router.put('/:id', validateParams(userIdParamsSchema), validateBody(updateUserSchema), updateUser);

// Reset user password
router.put('/:id/password', validateParams(userIdParamsSchema), validateBody(resetUserPasswordSchema), resetUserPassword);

// Delete (deactivate) a user
router.delete('/:id', validateParams(userIdParamsSchema), deleteUser);

export default router;
