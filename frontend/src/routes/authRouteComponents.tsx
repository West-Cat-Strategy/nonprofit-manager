import { lazy } from 'react';

export const Setup = lazy(() => import('../pages/auth/Setup'));
export const Login = lazy(() => import('../pages/auth/Login'));
export const AcceptInvitation = lazy(() => import('../pages/auth/AcceptInvitation'));
export const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
export const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
