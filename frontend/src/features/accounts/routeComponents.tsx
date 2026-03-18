import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: accounts route boundary
 *
 * Route components for account routes must resolve through feature ownership.
 */

export const AccountList = lazy(() => import('./pages/AccountListPage'));
export const AccountDetail = lazy(() => import('./pages/AccountDetailPage'));
export const AccountCreate = lazy(() => import('./pages/AccountCreatePage'));
export const AccountEdit = lazy(() => import('./pages/AccountEditPage'));
