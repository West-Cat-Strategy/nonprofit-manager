import { lazy } from 'react';

export const AccountList = lazy(() => import('../features/accounts/pages/AccountListPage'));
export const AccountDetail = lazy(() => import('../features/accounts/pages/AccountDetailPage'));
export const AccountCreate = lazy(() => import('../features/accounts/pages/AccountCreatePage'));
export const AccountEdit = lazy(() => import('../features/accounts/pages/AccountEditPage'));
export const ContactList = lazy(() => import('../features/contacts/pages/ContactListPage'));
export const ContactDetail = lazy(() => import('../features/contacts/pages/ContactDetailPage'));
export const ContactCreate = lazy(() => import('../features/contacts/pages/ContactCreatePage'));
export const ContactEdit = lazy(() => import('../features/contacts/pages/ContactEditPage'));
export const VolunteerList = lazy(() => import('../features/volunteers/pages/VolunteerListPage'));
export const VolunteerDetail = lazy(() => import('../features/volunteers/pages/VolunteerDetailPage'));
export const VolunteerCreate = lazy(() => import('../features/volunteers/pages/VolunteerCreatePage'));
export const VolunteerEdit = lazy(() => import('../features/volunteers/pages/VolunteerEditPage'));
export const AssignmentCreate = lazy(() => import('../features/volunteers/pages/AssignmentCreatePage'));
export const AssignmentEdit = lazy(() => import('../features/volunteers/pages/AssignmentEditPage'));
