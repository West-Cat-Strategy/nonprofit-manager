import { lazy } from 'react';

export const AccountList = lazy(() => import('../pages/people/accounts/AccountList'));
export const AccountDetail = lazy(() => import('../pages/people/accounts/AccountDetail'));
export const AccountCreate = lazy(() =>
  import('../pages/people/accounts/AccountCreate').then((m) => ({ default: m.AccountCreate }))
);
export const AccountEdit = lazy(() =>
  import('../pages/people/accounts/AccountEdit').then((m) => ({ default: m.AccountEdit }))
);
export const ContactList = lazy(() => import('../features/contacts/pages/ContactListPage'));
export const ContactDetail = lazy(() => import('../features/contacts/pages/ContactDetailPage'));
export const ContactCreate = lazy(() => import('../features/contacts/pages/ContactCreatePage'));
export const ContactEdit = lazy(() => import('../features/contacts/pages/ContactEditPage'));
export const VolunteerList = lazy(() => import('../pages/people/volunteers/VolunteerList'));
export const VolunteerDetail = lazy(() => import('../pages/people/volunteers/VolunteerDetail'));
export const VolunteerCreate = lazy(() =>
  import('../pages/people/volunteers/VolunteerCreate').then((m) => ({ default: m.VolunteerCreate }))
);
export const VolunteerEdit = lazy(() =>
  import('../pages/people/volunteers/VolunteerEdit').then((m) => ({ default: m.VolunteerEdit }))
);
export const AssignmentCreate = lazy(() =>
  import('../pages/people/volunteers/AssignmentCreate').then((m) => ({ default: m.AssignmentCreate }))
);
export const AssignmentEdit = lazy(() =>
  import('../pages/people/volunteers/AssignmentEdit').then((m) => ({ default: m.AssignmentEdit }))
);
