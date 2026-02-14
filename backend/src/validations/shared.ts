/**
 * Shared Validation Schemas
 * Common schemas used across all validation modules
 */

import { z } from 'zod';

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Password validation - strong password requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Weak password for updates (optional validation)
export const weakPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

// Phone number validation
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .optional()
  .or(z.literal(''));

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

// Address validation
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required').optional(),
  city: z.string().min(1, 'City is required').optional(),
  state: z.string().min(2, 'State is required').optional(),
  zip_code: z.string().min(5, 'ZIP code is required').optional(),
  country: z.string().min(1, 'Country is required').optional(),
});

// Pagination query parameters
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// File metadata
export const uploadedFileSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  original_filename: z.string().min(1, 'Original filename is required'),
  url: z.string().url('Invalid file URL'),
  mime_type: z.string().min(1, 'MIME type is required'),
  size: z.number().int().positive('File size must be positive'),
  upload_path: z.string().min(1, 'Upload path is required'),
  uploaded_by: uuidSchema,
  uploaded_at: z.date(),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;

// Pagination response
export const paginationResponseSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});

export type PaginationResponse = z.infer<typeof paginationResponseSchema>;

// Standard API success response
export const apiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
  message: z.string().optional(),
  pagination: paginationResponseSchema.optional(),
});

// Standard API error response
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

// Combined API response type
export const apiResponseSchema = z.union([
  apiSuccessResponseSchema,
  apiErrorResponseSchema,
]);

export type ApiSuccessResponse<T = unknown> = z.infer<typeof apiSuccessResponseSchema> & {
  data?: T;
};

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Date range validation
export const dateRangeSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
}).refine(
  (data) => data.start_date <= data.end_date,
  {
    message: 'End date must be greater than or equal to start date',
    path: ['end_date'],
  }
);

export type DateRange = z.infer<typeof dateRangeSchema>;

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(255, 'Name must be less than 255 characters')
  .trim();

// Status enums
export const activeStatusSchema = z.enum(['active', 'inactive']);

export type ActiveStatus = z.infer<typeof activeStatusSchema>;
