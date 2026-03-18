import * as rootInvitationService from '@services/invitationService';
import { syncUserRole as rootSyncUserRole } from '@services/userRoleService';
export * from '@services/invitationService';

export const invitationService = rootInvitationService;
export const syncUserRole = rootSyncUserRole;
