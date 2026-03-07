import { lazy } from 'react';

export const Setup = lazy(() => import('../features/auth/pages/SetupPage'));
export const Login = lazy(() => import('../features/auth/pages/LoginPage'));
export const AcceptInvitation = lazy(() => import('../features/auth/pages/AcceptInvitationPage'));
export const ForgotPassword = lazy(() => import('../features/auth/pages/ForgotPasswordPage'));
export const ResetPassword = lazy(() => import('../features/auth/pages/ResetPasswordPage'));
