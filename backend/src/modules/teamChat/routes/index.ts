import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { authenticate } from '@middleware/domains/auth';
import type { AuthRequest } from '@middleware/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { sendError } from '@modules/shared/http/envelope';
import { Permission } from '@utils/permissions';
import {
  teamChatAddMemberSchema,
  teamChatCaseMemberParamsSchema,
  teamChatCaseParamsSchema,
  teamChatMarkReadSchema,
  teamChatMessageCreateSchema,
  teamChatMessagesQuerySchema,
  teamChatStreamQuerySchema,
  teamMessengerConversationUpdateSchema,
  teamMessengerDirectConversationCreateSchema,
  teamMessengerGroupConversationCreateSchema,
  teamMessengerRoomMemberParamsSchema,
  teamMessengerRoomParamsSchema,
  teamMessengerStreamQuerySchema,
  teamMessengerTypingSchema,
} from '@validations/teamChat';
import { createTeamChatController } from '../controllers/teamChat.controller';
import { createTeamMessengerController } from '../controllers/teamMessenger.controller';
import { TeamChatRepository } from '../repositories/teamChat.repository';
import { TeamChatUseCase } from '../usecases/teamChat.usecase';
import { TeamMessengerUseCase } from '../usecases/teamMessenger.usecase';

const isTeamChatEnabled = (): boolean => process.env.TEAM_CHAT_ENABLED !== 'false';

const enforceFeatureFlag = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!isTeamChatEnabled()) {
    sendError(res, 'TEAM_CHAT_DISABLED', 'Team chat module is disabled', 404, undefined, req.correlationId);
    return;
  }

  next();
};

export const createTeamChatV2Routes = (): Router => {
  const repository = new TeamChatRepository();
  const controller = createTeamChatController(new TeamChatUseCase(repository));
  const messengerController = createTeamMessengerController(new TeamMessengerUseCase(repository));
  const router = Router();

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);
  router.use(enforceFeatureFlag);

  router.get('/inbox', requirePermission(Permission.TEAM_CHAT_VIEW), controller.getInbox);
  router.get(
    '/unread-summary',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    controller.getUnreadSummary
  );
  router.get(
    '/messenger/stream',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateQuery(teamMessengerStreamQuerySchema),
    messengerController.stream
  );
  router.get(
    '/messenger/contacts',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    messengerController.listContacts
  );
  router.get(
    '/messenger/conversations',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    messengerController.listConversations
  );
  router.post(
    '/messenger/conversations/direct',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateBody(teamMessengerDirectConversationCreateSchema),
    messengerController.startDirectConversation
  );
  router.post(
    '/messenger/conversations/group',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateBody(teamMessengerGroupConversationCreateSchema),
    messengerController.createGroupConversation
  );
  router.get(
    '/messenger/conversations/:roomId',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateParams(teamMessengerRoomParamsSchema),
    messengerController.getConversation
  );
  router.patch(
    '/messenger/conversations/:roomId',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateParams(teamMessengerRoomParamsSchema),
    validateBody(teamMessengerConversationUpdateSchema),
    messengerController.updateConversation
  );
  router.post(
    '/messenger/conversations/:roomId/messages',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateParams(teamMessengerRoomParamsSchema),
    validateBody(teamChatMessageCreateSchema),
    messengerController.sendMessage
  );
  router.post(
    '/messenger/conversations/:roomId/read',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateParams(teamMessengerRoomParamsSchema),
    validateBody(teamChatMarkReadSchema),
    messengerController.markRead
  );
  router.post(
    '/messenger/conversations/:roomId/typing',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateParams(teamMessengerRoomParamsSchema),
    validateBody(teamMessengerTypingSchema),
    messengerController.updateTyping
  );
  router.post(
    '/messenger/conversations/:roomId/members',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateParams(teamMessengerRoomParamsSchema),
    validateBody(teamChatAddMemberSchema),
    messengerController.addMember
  );
  router.delete(
    '/messenger/conversations/:roomId/members/:userId',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateParams(teamMessengerRoomMemberParamsSchema),
    messengerController.removeMember
  );

  router.get(
    '/cases/:caseId',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateParams(teamChatCaseParamsSchema),
    controller.getCaseRoom
  );

  router.get(
    '/cases/:caseId/messages',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateParams(teamChatCaseParamsSchema),
    validateQuery(teamChatMessagesQuerySchema),
    controller.listMessages
  );

  router.get(
    '/cases/:caseId/stream',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateParams(teamChatCaseParamsSchema),
    validateQuery(teamChatStreamQuerySchema),
    controller.stream
  );

  router.post(
    '/cases/:caseId/messages',
    requirePermission(Permission.TEAM_CHAT_POST),
    validateParams(teamChatCaseParamsSchema),
    validateBody(teamChatMessageCreateSchema),
    controller.createMessage
  );

  router.post(
    '/cases/:caseId/read',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateParams(teamChatCaseParamsSchema),
    validateBody(teamChatMarkReadSchema),
    controller.markRead
  );

  router.get(
    '/cases/:caseId/members',
    requirePermission(Permission.TEAM_CHAT_VIEW),
    validateParams(teamChatCaseParamsSchema),
    controller.listMembers
  );

  router.post(
    '/cases/:caseId/members',
    requirePermission(Permission.TEAM_CHAT_MANAGE),
    validateParams(teamChatCaseParamsSchema),
    validateBody(teamChatAddMemberSchema),
    controller.addMember
  );

  router.delete(
    '/cases/:caseId/members/:userId',
    requirePermission(Permission.TEAM_CHAT_MANAGE),
    validateParams(teamChatCaseMemberParamsSchema),
    controller.removeMember
  );

  return router;
};

export const teamChatV2Routes = createTeamChatV2Routes();
