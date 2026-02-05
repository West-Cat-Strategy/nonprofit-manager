import { lazy } from 'react';

export const AccountList = lazy(() => import('../pages/people/accounts/AccountList'));
export const AccountDetail = lazy(() => import('../pages/people/accounts/AccountDetail'));
export const AccountCreate = lazy(() =>
  import('../pages/people/accounts/AccountCreate').then((m) => ({ default: m.AccountCreate }))
);
export const AccountEdit = lazy(() =>
  import('../pages/people/accounts/AccountEdit').then((m) => ({ default: m.AccountEdit }))
);
export const ContactList = lazy(() => import('../pages/people/contacts/ContactList'));
export const ContactDetail = lazy(() => import('../pages/people/contacts/ContactDetail'));
export const ContactCreate = lazy(() =>
  import('../pages/people/contacts/ContactCreate').then((m) => ({ default: m.ContactCreate }))
);
export const ContactEdit = lazy(() =>
  import('../pages/people/contacts/ContactEdit').then((m) => ({ default: m.ContactEdit }))
);
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
