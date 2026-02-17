/**
 * Event Validation Schemas
 * Schemas for event creation, updates, and filtering
 */

import { z } from 'zod';
import { uuidSchema } from './shared';

// Event status enums
export const eventStatusSchema = z.enum(['planned', 'active', 'completed', 'cancelled']);

export type EventStatus = z.infer<typeof eventStatusSchema>;

// Registration status enums
export const registrationStatusSchema = z.enum(['registered', 'attended', 'no_show', 'cancelled']);

export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

// Create event
export const createEventSchema = z.object({
  event_name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  event_type: z.string().min(1).trim(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  location_name: z.string().max(255).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  capacity: z.number().int().positive().optional(),
  status: eventStatusSchema.default('planned'),
}).refine(
  (data) => data.start_date < data.end_date,
  {
    message: 'End date must be after start date',
    path: ['end_date'],
  }
);

export type CreateEventInput = z.infer<typeof createEventSchema>;

// Update event
export const updateEventSchema = z.object({
  event_name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  event_type: z.string().min(1).trim().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  location_name: z.string().max(255).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  capacity: z.number().int().positive().optional(),
  status: eventStatusSchema.optional(),
}).refine(
  (data) => {
    // Only validate if both dates are provided
    if (data.start_date && data.end_date) {
      return data.start_date < data.end_date;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['end_date'],
  }
);

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// Event filter
export const eventFilterSchema = z.object({
  event_type: z.string().optional(),
  status: eventStatusSchema.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  organizer_id: uuidSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;

// Event registration
export const eventRegistrationSchema = z.object({
  event_id: uuidSchema,
  contact_id: uuidSchema.optional(),
  volunteer_id: uuidSchema.optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.contact_id || data.volunteer_id,
  {
    message: 'Either contact_id or volunteer_id must be provided',
    path: ['contact_id'],
  }
);

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;

// Update event registration
export const updateEventRegistrationSchema = z.object({
  status: registrationStatusSchema.optional(),
  check_in_date: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateEventRegistrationInput = z.infer<typeof updateEventRegistrationSchema>;

// Re-export shared schemas
export { uuidSchema } from './shared';
