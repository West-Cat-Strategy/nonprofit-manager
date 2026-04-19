import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: invitations route boundary
 */

export const AcceptInvitation = lazy(() => import('./pages/AcceptInvitationPage'));
export const PortalAcceptInvitation = lazy(() => import('./pages/PortalAcceptInvitationPage'));
