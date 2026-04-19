import type { ReactNode } from 'react';
import {
  AccountList,
  AccountDetail,
  AccountCreate,
  AccountEdit,
} from '../features/accounts/routeComponents';
import {
  ContactList,
  ContactDetail,
  ContactCreate,
  ContactEdit,
  ContactPrint,
} from '../features/contacts/routeComponents';
import {
  VolunteerList,
  VolunteerDetail,
  VolunteerCreate,
  VolunteerEdit,
  AssignmentCreate,
  AssignmentEdit,
} from '../features/volunteers/routeComponents';
import type { RouteCatalogEntry } from './routeCatalog';

type PeopleCatalogSeed = Pick<
  RouteCatalogEntry,
  'id' | 'title' | 'path' | 'primaryAction' | 'mobilePriority' | 'parentId' | 'staffNav'
>;

export interface PeopleRouteDescriptor {
  shell: 'authenticated' | 'public';
  wrapper: 'protected';
  render: () => ReactNode;
  aliases?: readonly string[];
  catalog: PeopleCatalogSeed;
}

export const peopleRouteDescriptors: readonly PeopleRouteDescriptor[] = [
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <AccountList />,
    catalog: {
      id: 'accounts',
      title: 'Accounts',
      path: '/accounts',
      primaryAction: { label: 'New account', href: '/accounts/new' },
      staffNav: {
        group: 'secondary',
        order: 30,
        label: 'Accounts',
        shortLabel: 'Accounts',
        ariaLabel: 'Go to accounts',
        icon: '🏢',
        pinnedEligible: true,
      },
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <AccountCreate />,
    catalog: {
      id: 'account-create',
      title: 'Create Account',
      path: '/accounts/new',
      primaryAction: { label: 'Save account', href: '/accounts/new' },
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <AccountEdit />,
    catalog: {
      id: 'account-edit',
      title: 'Edit Account',
      path: '/accounts/:id/edit',
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <AccountDetail />,
    catalog: {
      id: 'account-detail',
      title: 'Account Detail',
      path: '/accounts/:id',
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <ContactList />,
    catalog: {
      id: 'contacts',
      title: 'People',
      path: '/contacts',
      primaryAction: { label: 'New person', href: '/contacts/new' },
      mobilePriority: 20,
      staffNav: {
        group: 'primary',
        order: 20,
        label: 'People',
        shortLabel: 'People',
        ariaLabel: 'Go to contacts',
        icon: '👤',
        pinnedEligible: true,
      },
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <ContactCreate />,
    catalog: {
      id: 'contact-create',
      title: 'Create Person',
      path: '/contacts/new',
      primaryAction: { label: 'Save person', href: '/contacts/new' },
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <ContactEdit />,
    catalog: {
      id: 'contact-edit',
      title: 'Edit Person',
      path: '/contacts/:id/edit',
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <ContactDetail />,
    catalog: {
      id: 'contact-detail',
      title: 'Person Detail',
      path: '/contacts/:id',
    },
  },
  {
    shell: 'public',
    wrapper: 'protected',
    render: () => <ContactPrint />,
    catalog: {
      id: 'contact-print',
      title: 'Print / Export',
      path: '/contacts/:id/print',
      parentId: 'contact-detail',
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <VolunteerList />,
    catalog: {
      id: 'volunteers',
      title: 'Volunteers',
      path: '/volunteers',
      primaryAction: { label: 'New volunteer', href: '/volunteers/new' },
      staffNav: {
        group: 'secondary',
        order: 40,
        label: 'Volunteers',
        shortLabel: 'Volunteers',
        ariaLabel: 'Go to volunteers',
        icon: '🤝',
        pinnedEligible: true,
      },
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <VolunteerCreate />,
    catalog: {
      id: 'volunteer-create',
      title: 'Create Volunteer',
      path: '/volunteers/new',
      primaryAction: { label: 'Save volunteer', href: '/volunteers/new' },
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <VolunteerEdit />,
    catalog: {
      id: 'volunteer-edit',
      title: 'Edit Volunteer',
      path: '/volunteers/:id/edit',
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <AssignmentCreate />,
    catalog: {
      id: 'volunteer-assignment-create',
      title: 'Create Assignment',
      path: '/volunteers/:volunteerId/assignments/new',
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <AssignmentEdit />,
    catalog: {
      id: 'volunteer-assignment-edit',
      title: 'Edit Assignment',
      path: '/volunteers/:volunteerId/assignments/:assignmentId/edit',
    },
  },
  {
    shell: 'authenticated',
    wrapper: 'protected',
    render: () => <VolunteerDetail />,
    catalog: {
      id: 'volunteer-detail',
      title: 'Volunteer Detail',
      path: '/volunteers/:id',
    },
  },
] as const;

export const authenticatedPeopleRouteDescriptors = peopleRouteDescriptors.filter(
  (descriptor) => descriptor.shell === 'authenticated'
);

export const publicPeopleRouteDescriptors = peopleRouteDescriptors.filter(
  (descriptor) => descriptor.shell === 'public'
);
