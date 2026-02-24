/**
 * Export Routes
 * API routes for exporting analytics data
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  exportAnalyticsSummary,
  exportDonations,
  exportVolunteerHours,
  exportEvents,
  exportComprehensive,
} from '@controllers/domains/operations';
import { authenticate } from '@middleware/domains/auth';
import { requireExportPermission } from '@middleware/domains/security';
import { loadDataScope } from '@middleware/domains/data';
import { validateBody } from '@middleware/zodValidation';
import { uuidSchema } from '@validations/shared';

const router = Router();

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO8601 date');

const formatSchema = z.enum(['csv', 'excel']);

const analyticsSummaryExportSchema = z.object({
  format: formatSchema.optional(),
  filename: z.string().optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  donor_type: z.string().optional(),
  payment_method: z.string().optional(),
});

const donationExportSchema = z.object({
  format: formatSchema.optional(),
  filename: z.string().optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  donor_id: uuidSchema.optional(),
  payment_method: z.string().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
});

const volunteerHoursExportSchema = z.object({
  format: formatSchema.optional(),
  filename: z.string().optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  volunteer_id: uuidSchema.optional(),
  activity_type: z.string().optional(),
});

const eventsExportSchema = z.object({
  format: formatSchema.optional(),
  filename: z.string().optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  event_type: z.string().optional(),
  status: z.string().optional(),
});

const comprehensiveExportSchema = z.object({
  format: formatSchema.optional(),
  filename: z.string().optional(),
  start_date: dateStringSchema,
  end_date: dateStringSchema,
});

// All routes require authentication and export permissions
router.use(authenticate);
router.use(requireExportPermission);
router.use(loadDataScope('exports'));

/**
 * POST /api/export/analytics-summary
 * Export analytics summary
 */
router.post('/analytics-summary', validateBody(analyticsSummaryExportSchema), exportAnalyticsSummary);

/**
 * POST /api/export/donations
 * Export donation data
 */
router.post('/donations', validateBody(donationExportSchema), exportDonations);

/**
 * POST /api/export/volunteer-hours
 * Export volunteer hours data
 */
router.post('/volunteer-hours', validateBody(volunteerHoursExportSchema), exportVolunteerHours);

/**
 * POST /api/export/events
 * Export event attendance data
 */
router.post('/events', validateBody(eventsExportSchema), exportEvents);

/**
 * POST /api/export/comprehensive
 * Export comprehensive report with multiple sheets
 */
router.post('/comprehensive', validateBody(comprehensiveExportSchema), exportComprehensive);

export default router;
