import { z } from 'zod';
import { uuidSchema } from './shared';

export const outcomeAttributionSchema = z.enum(['DIRECT', 'LIKELY', 'POSSIBLE']);

export const interactionOutcomeImpactItemSchema = z.object({
  outcomeDefinitionId: uuidSchema,
  impact: z.boolean().optional(),
  attribution: outcomeAttributionSchema.optional(),
  intensity: z.number().int().min(1).max(5).nullable().optional(),
  evidenceNote: z.string().max(2000).nullable().optional(),
});

export const updateInteractionOutcomeImpactsSchema = z.object({
  impacts: z.array(interactionOutcomeImpactItemSchema),
  mode: z.enum(['replace', 'merge']).optional(),
});

export const interactionOutcomeParamsSchema = z.object({
  caseId: uuidSchema,
  interactionId: uuidSchema,
});

export const caseOutcomeDefinitionsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
});

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const outcomesReportQuerySchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  programId: uuidSchema.optional(),
  staffId: uuidSchema.optional(),
  interactionType: z
    .enum(['note', 'email', 'call', 'meeting', 'update', 'status_change'])
    .optional(),
  bucket: z.enum(['week', 'month']).optional(),
  includeNonReportable: z.coerce.boolean().optional(),
});

export type UpdateInteractionOutcomeImpactsInput = z.infer<
  typeof updateInteractionOutcomeImpactsSchema
>;
export type InteractionOutcomeParamsInput = z.infer<typeof interactionOutcomeParamsSchema>;
export type CaseOutcomeDefinitionsQueryInput = z.infer<typeof caseOutcomeDefinitionsQuerySchema>;
export type OutcomesReportQueryInput = z.infer<typeof outcomesReportQuerySchema>;
