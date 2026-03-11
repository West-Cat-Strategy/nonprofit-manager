/**
 * Volunteer Validation Schemas
 * Schemas for volunteer profiles, assignments, hours, etc.
 */

import { z } from 'zod';
import { nameSchema, phoneSchema, dateRangeSchema, uuidSchema } from './shared';

// Re-export shared schemas used in volunteer validations
export { uuidSchema } from './shared';

// Volunteer status enums
export const volunteerStatusSchema = z.enum(['active', 'inactive', 'on_leave', 'retired']);

export type VolunteerStatus = z.infer<typeof volunteerStatusSchema>;

// Background check status
export const backgroundCheckStatusSchema = z.enum([
  'not_required',
  'pending',
  'in_progress',
  'approved',
  'rejected',
  'expired',
]);

export type BackgroundCheckStatus = z.infer<typeof backgroundCheckStatusSchema>;

// Availability status
export const availabilityStatusSchema = z.enum(['available', 'unavailable', 'limited']);

export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;

// Create volunteer
export const createVolunteerSchema = z.object({
  contact_id: uuidSchema,
  status: volunteerStatusSchema.default('active'),
  background_check_status: backgroundCheckStatusSchema.default('not_required'),
  background_check_date: z.coerce.date().optional(),
  availability_status: availabilityStatusSchema.default('available'),
  bio: z.string().max(2000).optional(),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  emergency_contact_name: nameSchema.optional(),
  emergency_contact_phone: phoneSchema.optional(),
});

export type CreateVolunteerInput = z.infer<typeof createVolunteerSchema>;

// Update volunteer
export const updateVolunteerSchema = z.object({
  status: volunteerStatusSchema.optional(),
  volunteer_status: z.union([volunteerStatusSchema, availabilityStatusSchema]).optional(),
  background_check_status: backgroundCheckStatusSchema.optional(),
  background_check_date: z.coerce.date().optional(),
  availability_status: availabilityStatusSchema.optional(),
  bio: z.string().max(2000).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).nullable().optional(),
  emergency_contact_name: nameSchema.optional(),
  emergency_contact_phone: phoneSchema.optional(),
});

export type UpdateVolunteerInput = z.infer<typeof updateVolunteerSchema>;

// Volunteer filter
export const volunteerFilterSchema = z.object({
  search: z.string().optional(),
  status: volunteerStatusSchema.optional(),
  background_check_status: backgroundCheckStatusSchema.optional(),
  availability_status: availabilityStatusSchema.optional(),
  skills: z.array(z.string()).optional(),
  created_after: z.coerce.date().optional(),
  created_before: z.coerce.date().optional(),
});

export type VolunteerFilterInput = z.infer<typeof volunteerFilterSchema>;

// Volunteer hours entry
export const volunteerHoursSchema = z.object({
  volunteer_id: uuidSchema,
  activity_date: z.coerce.date(),
  hours_logged: z.number().positive('Hours must be positive').max(24, 'Hours cannot exceed 24'),
  activity_type: z.string().min(1, 'Activity type is required'),
  notes: z.string().max(1000).optional(),
  event_id: uuidSchema.optional(),
});

export type VolunteerHoursInput = z.infer<typeof volunteerHoursSchema>;

// Update volunteer hours
export const updateVolunteerHoursSchema = z.object({
  hours_logged: z.number().positive('Hours must be positive').max(24).optional(),
  activity_type: z.string().optional(),
  notes: z.string().max(1000).optional(),
  activity_date: z.coerce.date().optional(),
});

export type UpdateVolunteerHoursInput = z.infer<typeof updateVolunteerHoursSchema>;

const assignmentTypeSchema = z.enum(['event', 'task', 'general']);

// Volunteer assignment
export const volunteerAssignmentSchema = z
  .object({
    volunteer_id: uuidSchema,
    event_id: uuidSchema.nullable().optional(),
    task_id: uuidSchema.nullable().optional(),
    assignment_type: assignmentTypeSchema.optional(),
    role: z.string().trim().min(1, 'Role must not be empty').optional(),
    start_time: z.coerce.date().optional(),
    assigned_date: z.coerce.date().optional(),
    end_time: z.coerce.date().optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    const assignmentType =
      value.assignment_type ?? (value.task_id ? 'task' : value.event_id ? 'event' : 'general');

    if (assignmentType === 'event' && !value.event_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['event_id'],
        message: 'Event is required when assignment type is "event"',
      });
    }

    if (assignmentType === 'task' && !value.task_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['task_id'],
        message: 'Task is required when assignment type is "task"',
      });
    }
  })
  .transform(({ assigned_date, assignment_type, event_id, task_id, ...value }) => ({
    ...value,
    event_id: event_id ?? undefined,
    task_id: task_id ?? undefined,
    assignment_type:
      assignment_type ?? (task_id ? 'task' : event_id ? 'event' : 'general'),
    start_time: value.start_time ?? assigned_date ?? new Date(),
  }));

export type VolunteerAssignmentInput = z.infer<typeof volunteerAssignmentSchema>;

// Update volunteer assignment
export const updateVolunteerAssignmentSchema = z.object({
  role: z.string().min(1, 'Role is required').optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  hours_logged: z.number().min(0, 'Hours must be non-negative').optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateVolunteerAssignmentInput = z.infer<typeof updateVolunteerAssignmentSchema>;

// Volunteer hours filter
export const volunteerHoursFilterSchema = z.object({
  volunteer_id: uuidSchema.optional(),
  activity_type: z.string().optional(),
  date_range: dateRangeSchema.optional(),
  min_hours: z.number().nonnegative().optional(),
  max_hours: z.number().positive().optional(),
});

export type VolunteerHoursFilterInput = z.infer<typeof volunteerHoursFilterSchema>;
