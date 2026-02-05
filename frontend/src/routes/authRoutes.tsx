/**
 * Authentication Routes
 * Handles login, setup, and invitation acceptance
 */

import { Route } from 'react-router-dom';
import { Setup, Login, AcceptInvitation } from './authRouteComponents';

// Lazy load auth pages

export const authRoutes = (
  <>
    <Route path="/setup" element={<Setup />} />
    <Route path="/login" element={<Login />} />
    <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
  </>
);
