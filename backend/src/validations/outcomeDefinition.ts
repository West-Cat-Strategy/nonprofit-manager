import { z } from 'zod';
import { uuidSchema } from './shared';

export const outcomeKeySchema = z
  .string()
  .min(3)
  .max(150)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Key must be lowercase snake_case');

export const createOutcomeDefinitionSchema = z.object({
  key: outcomeKeySchema,
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  isReportable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const updateOutcomeDefinitionSchema = z
  .object({
    key: outcomeKeySchema.optional(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    isActive: z.boolean().optional(),
    isReportable: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const outcomeDefinitionIdParamsSchema = z.object({
  id: uuidSchema,
});

export const listOutcomeDefinitionsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
});

export const reorderOutcomeDefinitionsSchema = z.object({
  orderedIds: z.array(uuidSchema).min(1),
});

export type CreateOutcomeDefinitionInput = z.infer<typeof createOutcomeDefinitionSchema>;
export type UpdateOutcomeDefinitionInput = z.infer<typeof updateOutcomeDefinitionSchema>;
export type OutcomeDefinitionIdParamsInput = z.infer<typeof outcomeDefinitionIdParamsSchema>;
export type ListOutcomeDefinitionsQueryInput = z.infer<typeof listOutcomeDefinitionsQuerySchema>;
export type ReorderOutcomeDefinitionsInput = z.infer<typeof reorderOutcomeDefinitionsSchema>;
