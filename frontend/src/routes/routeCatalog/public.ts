import type { RouteCatalogEntry } from './types';
import { portalPublicRoute, publicRoute } from './shared';

export const publicRouteCatalogEntries: readonly RouteCatalogEntry[] = [
  publicRoute({
    id: 'root',
    title: 'Workspace Redirect',
    section: 'Core',
    path: '/',
  }),
  publicRoute({
    id: 'setup',
    title: 'Workspace Setup',
    section: 'Auth',
    path: '/setup',
    primaryAction: { label: 'Create admin account', href: '/setup' },
  }),
  publicRoute({
    id: 'login',
    title: 'Sign In',
    section: 'Auth',
    path: '/login',
    primaryAction: { label: 'Sign in', href: '/login' },
  }),
  publicRoute({
    id: 'register',
    title: 'Register',
    section: 'Auth',
    path: '/register',
    primaryAction: { label: 'Create account', href: '/register' },
  }),
  publicRoute({
    id: 'accept-invitation',
    title: 'Accept Invitation',
    section: 'Auth',
    path: '/accept-invitation/:token',
    primaryAction: { label: 'Go to login', href: '/login' },
  }),
  publicRoute({
    id: 'forgot-password',
    title: 'Forgot Password',
    section: 'Auth',
    path: '/forgot-password',
    primaryAction: { label: 'Send reset link', href: '/forgot-password' },
  }),
  publicRoute({
    id: 'reset-password',
    title: 'Reset Password',
    section: 'Auth',
    path: '/reset-password/:token',
    primaryAction: { label: 'Request a new reset link', href: '/forgot-password' },
  }),
  publicRoute({
    id: 'public-report-snapshot',
    title: 'Public Report Snapshot',
    section: 'Auth',
    path: '/public/reports/:token',
  }),
  publicRoute({
    id: 'public-events',
    title: 'Public Events',
    section: 'Builder',
    path: '/public/events/:site',
  }),
  publicRoute({
    id: 'public-event-check-in',
    title: 'Public Event Check-In',
    section: 'Builder',
    path: '/event-check-in/:id',
  }),
  portalPublicRoute({
    id: 'portal-login',
    title: 'Portal Login',
    path: '/portal/login',
    primaryAction: { label: 'Sign in', href: '/portal/login' },
  }),
  portalPublicRoute({
    id: 'portal-signup',
    title: 'Portal Signup',
    path: '/portal/signup',
    primaryAction: { label: 'Submit request', href: '/portal/signup' },
  }),
  portalPublicRoute({
    id: 'portal-accept-invitation',
    title: 'Portal Invitation',
    path: '/portal/accept-invitation/:token',
    primaryAction: { label: 'Portal login', href: '/portal/login' },
  }),
];
