/**
 * Event Validation Schemas
 * Schemas for event creation, updates, and filtering
 */

import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema } from './shared';

export const eventTypeSchema = z.enum([
  'fundraiser',
  'community',
  'training',
  'meeting',
  'workshop',
  'webinar',
  'conference',
  'outreach',
  'volunteer',
  'social',
  'other',
]);

export const recurrencePatternSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export const reminderTimingTypeSchema = z.enum(['relative', 'absolute']);
export const checkInMethodSchema = z.enum(['manual', 'qr']);

// Event status enums
export const eventStatusSchema = z.enum(['planned', 'active', 'completed', 'cancelled', 'postponed']);

export type EventStatus = z.infer<typeof eventStatusSchema>;

// Registration status enums
export const registrationStatusSchema = z.enum([
  'registered',
  'waitlisted',
  'cancelled',
  'confirmed',
  'no_show',
]);

export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type EventReminderTimingType = z.infer<typeof reminderTimingTypeSchema>;

// Create event
export const createEventSchema = z
  .object({
    event_name: z.string().trim().min(1).max(255),
    description: z.string().max(2000).optional(),
    event_type: eventTypeSchema,
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    location_name: z.string().max(255).optional(),
    address_line1: z.string().max(255).optional(),
    address_line2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state_province: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    capacity: z.coerce.number().int().positive().optional(),
    status: eventStatusSchema.default('planned'),
    is_public: z.coerce.boolean().default(false),
    is_recurring: z.coerce.boolean().default(false),
    recurrence_pattern: recurrencePatternSchema.optional(),
    recurrence_interval: z.coerce.number().int().positive().optional(),
    recurrence_end_date: z.coerce.date().optional(),
  })
  .strict()
  .refine((data) => data.start_date < data.end_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
  })
  .refine(
    (data) => !data.is_recurring || (Boolean(data.recurrence_pattern) && Boolean(data.recurrence_interval)),
    {
      message: 'Recurring events require recurrence_pattern and recurrence_interval',
      path: ['recurrence_pattern'],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

// Update event
export const updateEventSchema = z
  .object({
    event_name: z.string().trim().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    event_type: eventTypeSchema.optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    location_name: z.string().max(255).optional(),
    address_line1: z.string().max(255).optional(),
    address_line2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state_province: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    capacity: z.coerce.number().int().positive().optional(),
    status: eventStatusSchema.optional(),
    is_public: z.coerce.boolean().optional(),
    is_recurring: z.coerce.boolean().optional(),
    recurrence_pattern: recurrencePatternSchema.optional(),
    recurrence_interval: z.coerce.number().int().positive().optional(),
    recurrence_end_date: z.coerce.date().optional(),
  })
  .strict()
  .refine(
    (data) => {
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
export const eventFilterSchema = z
  .object({
    event_type: eventTypeSchema.optional(),
    status: eventStatusSchema.optional(),
    is_public: z.coerce.boolean().optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    organizer_id: uuidSchema.optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export type EventFilterInput = z.infer<typeof eventFilterSchema>;

export const listEventsQuerySchema = eventFilterSchema.extend({
  sort_by: z
    .enum(['start_date', 'end_date', 'created_at', 'updated_at', 'name', 'status', 'event_type'])
    .optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const publicEventsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    event_type: eventTypeSchema.optional(),
    include_past: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort_by: z.enum(['start_date', 'name', 'created_at']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    site: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9.-]+$/i, 'site must be a valid site key')
      .optional(),
  })
  .strict();

export const publicEventsSiteParamsSchema = z.object({
  siteKey: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9.-]+$/i, 'siteKey must be a valid site key'),
});

export const eventIdParamsSchema = z.object({
  id: uuidSchema,
});

export const publicEventSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/i, 'slug must be a valid path segment'),
});

export const eventAutomationParamsSchema = z.object({
  id: uuidSchema,
  automationId: uuidSchema,
});

// Event registration
export const eventRegistrationSchema = z
  .object({
    event_id: uuidSchema,
    contact_id: uuidSchema.optional(),
    volunteer_id: uuidSchema.optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict()
  .refine((data) => data.contact_id || data.volunteer_id, {
    message: 'Either contact_id or volunteer_id must be provided',
    path: ['contact_id'],
  });

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;

// Update event registration
export const updateEventRegistrationSchema = z
  .object({
    status: registrationStatusSchema.optional(),
    check_in_date: z.coerce.date().optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export type UpdateEventRegistrationInput = z.infer<typeof updateEventRegistrationSchema>;

export const listEventRegistrationsQuerySchema = z
  .object({
    status: registrationStatusSchema.optional(),
    registration_status: registrationStatusSchema.optional(),
    checked_in: z.coerce.boolean().optional(),
  })
  .strict();

export const listRegistrationsQuerySchema = z
  .object({
    event_id: uuidSchema.optional(),
    contact_id: uuidSchema.optional(),
    status: registrationStatusSchema.optional(),
    registration_status: registrationStatusSchema.optional(),
    checked_in: z.coerce.boolean().optional(),
  })
  .strict();

export const createRegistrationSchema = z
  .object({
    contact_id: uuidSchema,
    case_id: uuidSchema.optional(),
    registration_status: registrationStatusSchema.optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const updateRegistrationSchema = z
  .object({
    registration_status: registrationStatusSchema.optional(),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const sendRemindersSchema = z
  .object({
    sendEmail: z.coerce.boolean().optional(),
    sendSms: z.coerce.boolean().optional(),
    customMessage: z.string().max(500).optional(),
  })
  .strict();

export const createAutomationSchema = z
  .object({
    timingType: reminderTimingTypeSchema,
    relativeMinutesBefore: z.coerce.number().int().min(1).optional(),
    absoluteSendAt: z.string().datetime().optional(),
    sendEmail: z.coerce.boolean().optional(),
    sendSms: z.coerce.boolean().optional(),
    customMessage: z.string().max(500).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export const updateAutomationSchema = z
  .object({
    timingType: reminderTimingTypeSchema.optional(),
    relativeMinutesBefore: z.coerce.number().int().min(1).optional(),
    absoluteSendAt: z.string().datetime().optional(),
    sendEmail: z.coerce.boolean().optional(),
    sendSms: z.coerce.boolean().optional(),
    customMessage: z.string().max(500).optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .strict();

export const syncAutomationsSchema = z
  .object({
    items: z.array(createAutomationSchema),
  })
  .strict();

export const eventCheckInScanSchema = z
  .object({
    token: uuidSchema,
  })
  .strict();

export const updateEventCheckInSettingsSchema = z
  .object({
    public_checkin_enabled: z.coerce.boolean(),
  })
  .strict();

export const globalEventCheckInScanSchema = z
  .object({
    token: uuidSchema,
  })
  .strict();

export const eventWalkInCheckInSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    notes: z.string().max(1000).optional(),
    registration_status: registrationStatusSchema.optional(),
  })
  .strict()
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or phone is required',
    path: ['email'],
  });

export const publicEventCheckInSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    pin: z
      .string()
      .trim()
      .min(4)
      .max(12)
      .regex(/^[0-9]+$/),
  })
  .strict()
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or phone is required',
    path: ['email'],
  });

export const publicEventRegistrationSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    email: emailSchema,
    phone: phoneSchema.optional(),
    notes: z.string().max(1000).optional(),
    registration_status: registrationStatusSchema.optional(),
  })
  .strict();

// Re-export shared schemas
export { uuidSchema } from './shared';
