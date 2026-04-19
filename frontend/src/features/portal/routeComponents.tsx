import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: portal route boundary
 *
 * Route components for portal routes must resolve through feature ownership.
 */

export const PortalLogin = lazy(() => import('./pages/PortalLoginPage'));
export const PortalSignup = lazy(() => import('./pages/PortalSignupPage'));
export const PortalForgotPassword = lazy(() => import('./pages/PortalForgotPasswordPage'));
export const PortalResetPassword = lazy(() => import('./pages/PortalResetPasswordPage'));
export const PortalAcceptInvitation = lazy(() => import('../invitations/pages/PortalAcceptInvitationPage'));
export const PortalDashboard = lazy(() => import('./pages/PortalDashboardPage'));
export const PortalProfile = lazy(() => import('./pages/PortalProfilePage'));
export const PortalPeople = lazy(() => import('./pages/PortalPeoplePage'));
export const PortalCalendar = lazy(() => import('./pages/PortalCalendarPage'));
export const PortalEvents = lazy(() => import('./pages/PortalEventsPage'));
export const PortalAppointments = lazy(() => import('./pages/PortalAppointmentsPage'));
export const PortalMessages = lazy(() => import('./pages/PortalMessagesPage'));
export const PortalDocuments = lazy(() => import('./pages/PortalDocumentsPage'));
export const PortalNotes = lazy(() => import('./pages/PortalNotesPage'));
export const PortalForms = lazy(() => import('./pages/PortalFormsPage'));
export const PortalReminders = lazy(() => import('./pages/PortalRemindersPage'));
export const PortalCases = lazy(() => import('./pages/PortalCasesPage'));
export const PortalCaseDetail = lazy(() => import('./pages/PortalCaseDetailPage'));
export const PublicCaseForm = lazy(() => import('./pages/PublicCaseFormPage'));
