/**
 * People Routes
 * Handles accounts, contacts, and volunteers
 */

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';

// Lazy load account pages
const AccountList = lazy(() => import('../pages/people/accounts/AccountList'));
const AccountDetail = lazy(() => import('../pages/people/accounts/AccountDetail'));
const AccountCreate = lazy(() => import('../pages/people/accounts/AccountCreate').then(m => ({ default: m.AccountCreate })));
const AccountEdit = lazy(() => import('../pages/people/accounts/AccountEdit').then(m => ({ default: m.AccountEdit })));

// Lazy load contact pages
const ContactList = lazy(() => import('../pages/people/contacts/ContactList'));
const ContactDetail = lazy(() => import('../pages/people/contacts/ContactDetail'));
const ContactCreate = lazy(() => import('../pages/people/contacts/ContactCreate').then(m => ({ default: m.ContactCreate })));
const ContactEdit = lazy(() => import('../pages/people/contacts/ContactEdit').then(m => ({ default: m.ContactEdit })));

// Lazy load volunteer pages
const VolunteerList = lazy(() => import('../pages/people/volunteers/VolunteerList'));
const VolunteerDetail = lazy(() => import('../pages/people/volunteers/VolunteerDetail'));
const VolunteerCreate = lazy(() => import('../pages/people/volunteers/VolunteerCreate').then(m => ({ default: m.VolunteerCreate })));
const VolunteerEdit = lazy(() => import('../pages/people/volunteers/VolunteerEdit').then(m => ({ default: m.VolunteerEdit })));
const AssignmentCreate = lazy(() => import('../pages/people/volunteers/AssignmentCreate').then(m => ({ default: m.AssignmentCreate })));
const AssignmentEdit = lazy(() => import('../pages/people/volunteers/AssignmentEdit').then(m => ({ default: m.AssignmentEdit })));

interface RouteWrapperProps {
  children: ReactNode;
}

export function createPeopleRoutes(ProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      {/* Account Routes */}
      <Route
        path="/accounts"
        element={<ProtectedRoute><AccountList /></ProtectedRoute>}
      />
      <Route
        path="/accounts/new"
        element={<ProtectedRoute><AccountCreate /></ProtectedRoute>}
      />
      <Route
        path="/accounts/:id/edit"
        element={<ProtectedRoute><AccountEdit /></ProtectedRoute>}
      />
      <Route
        path="/accounts/:id"
        element={<ProtectedRoute><AccountDetail /></ProtectedRoute>}
      />

      {/* Contact Routes */}
      <Route
        path="/contacts"
        element={<ProtectedRoute><ContactList /></ProtectedRoute>}
      />
      <Route
        path="/contacts/new"
        element={<ProtectedRoute><ContactCreate /></ProtectedRoute>}
      />
      <Route
        path="/contacts/:id/edit"
        element={<ProtectedRoute><ContactEdit /></ProtectedRoute>}
      />
      <Route
        path="/contacts/:id"
        element={<ProtectedRoute><ContactDetail /></ProtectedRoute>}
      />

      {/* Volunteer Routes */}
      <Route
        path="/volunteers"
        element={<ProtectedRoute><VolunteerList /></ProtectedRoute>}
      />
      <Route
        path="/volunteers/new"
        element={<ProtectedRoute><VolunteerCreate /></ProtectedRoute>}
      />
      <Route
        path="/volunteers/:id/edit"
        element={<ProtectedRoute><VolunteerEdit /></ProtectedRoute>}
      />
      <Route
        path="/volunteers/:volunteerId/assignments/new"
        element={<ProtectedRoute><AssignmentCreate /></ProtectedRoute>}
      />
      <Route
        path="/volunteers/:volunteerId/assignments/:assignmentId/edit"
        element={<ProtectedRoute><AssignmentEdit /></ProtectedRoute>}
      />
      <Route
        path="/volunteers/:id"
        element={<ProtectedRoute><VolunteerDetail /></ProtectedRoute>}
      />
    </>
  );
}

// Re-export lazy components for backwards compatibility
export {
  AccountList,
  AccountDetail,
  AccountCreate,
  AccountEdit,
  ContactList,
  ContactDetail,
  ContactCreate,
  ContactEdit,
  VolunteerList,
  VolunteerDetail,
  VolunteerCreate,
  VolunteerEdit,
  AssignmentCreate,
  AssignmentEdit,
};
