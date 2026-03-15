import { z } from 'zod';
import { isoDateSchema, optionalStrictBooleanSchema, uuidSchema } from './shared';

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
  includeInactive: optionalStrictBooleanSchema,
});

const dateStringSchema = isoDateSchema;

export const outcomesReportQuerySchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  programId: uuidSchema.optional(),
  staffId: uuidSchema.optional(),
  source: z.enum(['all', 'interaction', 'event']).optional(),
  interactionType: z
    .enum(['note', 'email', 'call', 'meeting', 'update', 'status_change', 'other'])
    .optional(),
  bucket: z.enum(['week', 'month']).optional(),
  includeNonReportable: optionalStrictBooleanSchema,
});

export type UpdateInteractionOutcomeImpactsInput = z.infer<
  typeof updateInteractionOutcomeImpactsSchema
>;
export type InteractionOutcomeParamsInput = z.infer<typeof interactionOutcomeParamsSchema>;
export type CaseOutcomeDefinitionsQueryInput = z.infer<typeof caseOutcomeDefinitionsQuerySchema>;
export type OutcomesReportQueryInput = z.infer<typeof outcomesReportQuerySchema>;
