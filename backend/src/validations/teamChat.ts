import { z } from 'zod';
import { uuidSchema } from './shared';

const membershipRoleSchema = z.enum(['owner', 'member', 'observer']);

export const teamChatCaseParamsSchema = z.object({
  caseId: uuidSchema,
});

export const teamChatCaseMemberParamsSchema = z.object({
  caseId: uuidSchema,
  userId: uuidSchema,
});

export const teamChatMessageCreateSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  parent_message_id: z.union([uuidSchema, z.null()]).optional(),
  mention_user_ids: z.array(uuidSchema).max(10).optional(),
});

export const teamChatMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    after_message_id: uuidSchema.optional(),
    before_message_id: uuidSchema.optional(),
  })
  .refine((data) => !(data.after_message_id && data.before_message_id), {
    message: 'Only one cursor is allowed: after_message_id or before_message_id',
    path: ['after_message_id'],
  });

export const teamChatMarkReadSchema = z.object({
  message_id: uuidSchema.optional(),
});

export const teamChatAddMemberSchema = z.object({
  user_id: uuidSchema,
  membership_role: membershipRoleSchema.optional(),
});

export type TeamChatMessageCreateInput = z.infer<typeof teamChatMessageCreateSchema>;
export type TeamChatMessagesQueryInput = z.infer<typeof teamChatMessagesQuerySchema>;
export type TeamChatMarkReadInput = z.infer<typeof teamChatMarkReadSchema>;
export type TeamChatAddMemberInput = z.infer<typeof teamChatAddMemberSchema>;
