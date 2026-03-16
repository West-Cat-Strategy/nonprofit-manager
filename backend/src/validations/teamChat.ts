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

export const teamMessengerRoomParamsSchema = z.object({
  roomId: uuidSchema,
});

export const teamMessengerRoomMemberParamsSchema = z.object({
  roomId: uuidSchema,
  userId: uuidSchema,
});

export const teamChatMessageCreateSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  parent_message_id: z.union([uuidSchema, z.null()]).optional(),
  client_message_id: uuidSchema.optional(),
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

export const teamMessengerDirectConversationCreateSchema = z.object({
  participant_user_id: uuidSchema,
});

export const teamMessengerGroupConversationCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  participant_user_ids: z.array(uuidSchema).min(2).max(20),
});

export const teamMessengerConversationUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

export const teamMessengerTypingSchema = z.object({
  is_typing: z.boolean(),
});

export const teamMessengerStreamQuerySchema = z.object({
  channels: z.string().optional(),
});

export const teamChatStreamQuerySchema = z.object({
  channels: z.string().optional(),
});

export type TeamChatMessageCreateInput = z.infer<typeof teamChatMessageCreateSchema>;
export type TeamChatMessagesQueryInput = z.infer<typeof teamChatMessagesQuerySchema>;
export type TeamChatMarkReadInput = z.infer<typeof teamChatMarkReadSchema>;
export type TeamChatAddMemberInput = z.infer<typeof teamChatAddMemberSchema>;
export type TeamMessengerDirectConversationCreateInput = z.infer<
  typeof teamMessengerDirectConversationCreateSchema
>;
export type TeamMessengerGroupConversationCreateInput = z.infer<
  typeof teamMessengerGroupConversationCreateSchema
>;
export type TeamMessengerConversationUpdateInput = z.infer<
  typeof teamMessengerConversationUpdateSchema
>;
export type TeamMessengerTypingInput = z.infer<typeof teamMessengerTypingSchema>;
export type TeamChatStreamQueryInput = z.infer<typeof teamChatStreamQuerySchema>;
