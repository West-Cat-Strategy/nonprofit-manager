/**
 * People Routes
 * Handles accounts, contacts, and volunteers
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import {
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
} from './peopleRouteComponents';

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
