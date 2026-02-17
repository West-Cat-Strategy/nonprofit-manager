/**
 * Portal Routes
 * Handles client portal pages
 */

import type { ReactNode } from 'react';
import { Route } from 'react-router-dom';
import {
  PortalLogin,
  PortalSignup,
  PortalAcceptInvitation,
  PortalDashboard,
  PortalProfile,
  PortalPeople,
  PortalEvents,
  PortalAppointments,
  PortalDocuments,
  PortalNotes,
  PortalForms,
  PortalReminders,
} from './portalRouteComponents';

interface RouteWrapperProps {
  children: ReactNode;
}

export function createPortalRoutes(PortalProtectedRoute: React.ComponentType<RouteWrapperProps>) {
  return (
    <>
      {/* Public portal routes */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/signup" element={<PortalSignup />} />
      <Route path="/portal/accept-invitation/:token" element={<PortalAcceptInvitation />} />

      {/* Protected portal routes */}
      <Route
        path="/portal"
        element={<PortalProtectedRoute><PortalDashboard /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/profile"
        element={<PortalProtectedRoute><PortalProfile /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/people"
        element={<PortalProtectedRoute><PortalPeople /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/events"
        element={<PortalProtectedRoute><PortalEvents /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/appointments"
        element={<PortalProtectedRoute><PortalAppointments /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/documents"
        element={<PortalProtectedRoute><PortalDocuments /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/notes"
        element={<PortalProtectedRoute><PortalNotes /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/forms"
        element={<PortalProtectedRoute><PortalForms /></PortalProtectedRoute>}
      />
      <Route
        path="/portal/reminders"
        element={<PortalProtectedRoute><PortalReminders /></PortalProtectedRoute>}
      />
    </>
  );
}
