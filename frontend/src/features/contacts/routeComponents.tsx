import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: contacts route boundary
 *
 * Route components for contact routes must resolve through feature ownership.
 */

export const ContactList = lazy(() => import('./pages/ContactListPage'));
export const ContactDetail = lazy(() => import('./pages/ContactDetailPage'));
export const ContactCreate = lazy(() => import('./pages/ContactCreatePage'));
export const ContactEdit = lazy(() => import('./pages/ContactEditPage'));
<<<<<<< HEAD
export const ContactPrint = lazy(() => import('./pages/ContactPrintPage'));
=======
>>>>>>> origin/main
