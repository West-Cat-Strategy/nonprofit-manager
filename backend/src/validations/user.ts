/**
 * User Validation Schemas
 * Schemas for user profile, updates, role management, etc.
 */

import { z } from 'zod';
import { emailSchema, nameSchema, phoneSchema } from './shared';

<<<<<<< HEAD
// Roles are stored as catalog-driven slugs. Keep the schema permissive so custom
// roles can pass through while the service layer normalizes aliases and validates
// against the role catalog when needed.
export const userRoleSchema = z.string().trim().min(1).max(120);
=======
// User role enum
export const userRoleSchema = z.enum(['admin', 'manager', 'staff', 'member', 'volunteer']);
>>>>>>> origin/main

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

const optionalTextFieldSchema = z.string().max(255).optional().or(z.literal(''));

const profilePictureSchema = z
  .string()
  .max(8_000_000, 'Profile picture payload is too large')
  .refine((value) => value.startsWith('data:image/') || z.string().url().safeParse(value).success, {
    message: 'Profile picture must be an image data URL or URL',
  });

const userAlternativeEmailSchema = z
  .object({
    email: emailSchema,
    label: z.string().trim().min(1).max(100),
    isVerified: z.boolean(),
  })
  .strict();

const userNotificationSettingsSchema = z
  .object({
    emailNotifications: z.boolean(),
    taskReminders: z.boolean(),
    eventReminders: z.boolean(),
    donationAlerts: z.boolean(),
    caseUpdates: z.boolean(),
    weeklyDigest: z.boolean(),
    marketingEmails: z.boolean(),
  })
  .strict();

// Update user profile
export const updateUserProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    email: emailSchema.optional(),
    emailSharedWithClients: z.boolean().optional(),
    emailSharedWithUsers: z.boolean().optional(),
    alternativeEmails: z.array(userAlternativeEmailSchema).optional(),
    displayName: optionalTextFieldSchema,
    alternativeName: optionalTextFieldSchema,
    pronouns: z.string().max(255).optional().or(z.literal('')),
    title: optionalTextFieldSchema,
    cellPhone: phoneSchema,
    contactNumber: phoneSchema,
    profilePicture: profilePictureSchema.nullable().optional(),
    notifications: userNotificationSettingsSchema.optional(),
  })
  .strict();

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
