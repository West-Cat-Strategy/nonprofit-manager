/**
 * Portal Routes
 * Handles client portal pages
 */

import { lazy, ReactNode } from 'react';
import { Route } from 'react-router-dom';

// Lazy load portal pages (remain in pages/portal directory)
const PortalLogin = lazy(() => import('../pages/PortalLogin'));
const PortalSignup = lazy(() => import('../pages/PortalSignup'));
const PortalAcceptInvitation = lazy(() => import('../pages/PortalAcceptInvitation'));
const PortalDashboard = lazy(() => import('../pages/PortalDashboard'));
const PortalProfile = lazy(() => import('../pages/PortalProfile'));
const PortalPeople = lazy(() => import('../pages/PortalPeople'));
const PortalEvents = lazy(() => import('../pages/PortalEvents'));
const PortalAppointments = lazy(() => import('../pages/PortalAppointments'));
const PortalDocuments = lazy(() => import('../pages/PortalDocuments'));
const PortalNotes = lazy(() => import('../pages/PortalNotes'));
const PortalForms = lazy(() => import('../pages/PortalForms'));
const PortalReminders = lazy(() => import('../pages/PortalReminders'));

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

// Re-export lazy components for backwards compatibility
export {
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
};
