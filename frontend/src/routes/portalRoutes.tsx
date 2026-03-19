/**
 * Portal Routes
 * Handles client portal pages
 */

import { Route } from 'react-router-dom';
import {
  PortalAppointments,
  PortalAcceptInvitation,
  PortalCalendar,
  PortalCaseDetail,
  PortalCases,
  PortalDashboard,
  PortalDocuments,
  PortalEvents,
  PortalForms,
  PortalLogin,
  PortalMessages,
  PortalNotes,
  PortalPeople,
  PortalProfile,
  PortalReminders,
  PortalSignup,
} from '../features/portal/routeComponents';

export function createPortalPublicRoutes() {
  return (
    <>
      {/* Public portal routes */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/signup" element={<PortalSignup />} />
      <Route path="/portal/accept-invitation/:token" element={<PortalAcceptInvitation />} />
    </>
  );
}

export function createPortalProtectedRoutes() {
  return (
    <>
      <Route path="/portal" element={<PortalDashboard />} />
      <Route path="/portal/profile" element={<PortalProfile />} />
      <Route path="/portal/people" element={<PortalPeople />} />
      <Route path="/portal/calendar" element={<PortalCalendar />} />
      <Route path="/portal/events" element={<PortalEvents />} />
      <Route path="/portal/messages" element={<PortalMessages />} />
      <Route path="/portal/cases" element={<PortalCases />} />
      <Route path="/portal/cases/:id" element={<PortalCaseDetail />} />
      <Route path="/portal/appointments" element={<PortalAppointments />} />
      <Route path="/portal/documents" element={<PortalDocuments />} />
      <Route path="/portal/notes" element={<PortalNotes />} />
      <Route path="/portal/forms" element={<PortalForms />} />
      <Route path="/portal/reminders" element={<PortalReminders />} />
    </>
  );
}
