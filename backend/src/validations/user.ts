/**
 * User Validation Schemas
 * Schemas for user profile, updates, role management, etc.
 */

import { z } from 'zod';
import { emailSchema, nameSchema, phoneSchema } from './shared';

// User role enum
export const userRoleSchema = z.enum(['admin', 'manager', 'staff', 'member', 'volunteer']);

export type UserRole = z.infer<typeof userRoleSchema>;

// Create user (admin action)
export const createUserSchema = z.object({
  email: emailSchema,
  first_name: nameSchema,
  last_name: nameSchema,
  role: userRoleSchema,
  phone: phoneSchema.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Update user profile
export const updateUserProfileSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  bio: z.string().max(1000).optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// Update user role
export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// User preferences
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  notifications_email: z.boolean().default(true),
  notifications_push: z.boolean().default(false),
  digest_frequency: z.enum(['daily', 'weekly', 'monthly', 'never']).default('weekly'),
});

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;

// User search/filter
export const userFilterSchema = z.object({
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
  created_after: z.coerce.date().optional(),
  created_before: z.coerce.date().optional(),
});

export type UserFilterInput = z.infer<typeof userFilterSchema>;
