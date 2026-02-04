/**
 * Authentication Routes
 * Handles login, setup, and invitation acceptance
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';

// Lazy load auth pages
const Setup = lazy(() => import('../pages/auth/Setup'));
const Login = lazy(() => import('../pages/auth/Login'));
const AcceptInvitation = lazy(() => import('../pages/auth/AcceptInvitation'));

export const authRoutes = (
  <>
    <Route path="/setup" element={<Setup />} />
    <Route path="/login" element={<Login />} />
    <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
  </>
);

// Re-export lazy components for backwards compatibility
export { Setup, Login, AcceptInvitation };
