import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: team-chat route boundary
 *
 * Route components for team-chat routes must resolve through feature ownership.
 */

export const TeamChatInboxPage = lazy(() => import('./pages/TeamChatInboxPage'));
