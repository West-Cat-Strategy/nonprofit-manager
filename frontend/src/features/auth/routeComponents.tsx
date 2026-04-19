import { lazy } from 'react';

/**
 * MODULE-OWNERSHIP: auth route boundary
 *
 * Route components for auth routes must resolve through feature ownership.
 */

export const Setup = lazy(() => import('./pages/SetupPage'));
export const Login = lazy(() => import('./pages/LoginPage'));
export const Register = lazy(() => import('./pages/RegisterPage'));
export const AcceptInvitation = lazy(() => import('../invitations/pages/AcceptInvitationPage'));
export const AdminRegistrationReview = lazy(() => import('./pages/AdminRegistrationReviewPage'));
export const ForgotPassword = lazy(() => import('./pages/ForgotPasswordPage'));
export const ResetPassword = lazy(() => import('./pages/ResetPasswordPage'));
