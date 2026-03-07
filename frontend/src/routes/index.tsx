import { lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import AdminRoute from '../components/AdminRoute';
import PortalShellRoute from '../components/PortalShellRoute';
import PublicShellRoute from '../components/PublicShellRoute';
import { ProtectedRoute, NeoBrutalistRoute } from '../components/auth';
import AuthenticatedShellRoute from '../components/auth/AuthenticatedShellRoute';
import PageLoader from '../components/PageLoader';
import { logout } from '../features/auth/state';
import { portalLogout } from '../features/portalAuth/state';

// Import route creators
import { createPeopleRoutes } from './peopleRoutes';
import { createEngagementRoutes } from './engagementRoutes';
import { createFinanceRoutes } from './financeRoutes';
import { createAnalyticsRoutes } from './analyticsRoutes';
import { createAdminRoutes } from './adminRoutes';
import { createBuilderRoutes } from './builderRoutes';
import { createWebsiteRoutes } from './websiteRoutes';
import { createPortalProtectedRoutes, createPortalPublicRoutes } from './portalRoutes';
import { createWorkflowRoutes } from './workflowRoutes';

// Lazy load auth pages
const Setup = lazy(() => import('../features/auth/pages/SetupPage'));
const Login = lazy(() => import('../features/auth/pages/LoginPage'));
const Register = lazy(() => import('../features/auth/pages/RegisterPage'));
const AcceptInvitation = lazy(() => import('../features/auth/pages/AcceptInvitationPage'));
const ForgotPassword = lazy(() => import('../features/auth/pages/ForgotPasswordPage'));
const ResetPassword = lazy(() => import('../features/auth/pages/ResetPasswordPage'));
const PublicReportSnapshot = lazy(() => import('../pages/public/PublicReportSnapshot'));
const PublicEventCheckInPage = lazy(
  () => import('../features/events/pages/PublicEventCheckInPage')
);
const PublicEventsPage = lazy(() => import('../features/events/pages/PublicEventsPage'));

// Lazy load Neo-Brutalist pages (remain in their directory)
const NeoBrutalistDashboard = lazy(() => import('../pages/neo-brutalist/NeoBrutalistDashboard'));
const LinkingModule = lazy(() => import('../pages/neo-brutalist/LinkingModule'));
const OperationsBoard = lazy(() => import('../pages/neo-brutalist/OperationsBoard'));
const OutreachCenter = lazy(() => import('../pages/neo-brutalist/OutreachCenter'));
const PeopleDirectory = lazy(() => import('../pages/neo-brutalist/PeopleDirectory'));
const ThemeAudit = lazy(() => import('../pages/neo-brutalist/ThemeAudit'));

const removedLegacyRedirectPaths = new Set([
  '/email-marketing',
  '/admin/audit-logs',
  '/settings/organization',
]);

// AppRoutes component with setup check logic
const AppRoutes = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, authLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const legacyFallbackPath = isAuthenticated || Boolean(user) ? '/dashboard' : '/login';

  useEffect(() => {
    const handleUnauthorized = () => {
      if (window.location.pathname.startsWith('/portal')) {
        return;
      }
      dispatch(logout());
      navigate('/login', { replace: true });
    };

    const handlePortalUnauthorized = () => {
      dispatch(portalLogout());
      navigate('/portal/login', { replace: true });
    };

    window.addEventListener('app:unauthorized', handleUnauthorized);
    window.addEventListener('portal:unauthorized', handlePortalUnauthorized);
    return () => {
      window.removeEventListener('app:unauthorized', handleUnauthorized);
      window.removeEventListener('portal:unauthorized', handlePortalUnauthorized);
    };
  }, [dispatch, navigate]);

  // Explicitly retire old deep links instead of leaving them on the auth-loading shell.
  if (removedLegacyRedirectPaths.has(location.pathname)) {
    return <Navigate to={legacyFallbackPath} replace />;
  }

  if (authLoading && location.pathname === '/') {
    return <PageLoader />;
  }

  return (
    <Routes>
      <Route element={<PublicShellRoute />}>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/public/reports/:token" element={<PublicReportSnapshot />} />
        <Route path="/public/events/:site" element={<PublicEventsPage />} />
        <Route path="/event-check-in/:id" element={<PublicEventCheckInPage />} />
        {createPortalPublicRoutes()}
      </Route>

      <Route element={<PortalShellRoute />}>
        {createPortalProtectedRoutes()}
      </Route>

      <Route element={<AuthenticatedShellRoute />}>
        {/* Neo-Brutalist Dashboard (Primary) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <NeoBrutalistDashboard />
            </ProtectedRoute>
          }
        />

        {/* People Routes (Accounts, Contacts, Volunteers) */}
        {createPeopleRoutes(ProtectedRoute)}

        {/* LOOP Module: People Directory */}
        <Route
          path="/people"
          element={
            <NeoBrutalistRoute>
              <PeopleDirectory />
            </NeoBrutalistRoute>
          }
        />

        {/* LOOP Module: Linking */}
        <Route
          path="/linking"
          element={
            <NeoBrutalistRoute>
              <LinkingModule />
            </NeoBrutalistRoute>
          }
        />

        {/* LOOP Module: Operations */}
        <Route
          path="/operations"
          element={
            <NeoBrutalistRoute>
              <OperationsBoard />
            </NeoBrutalistRoute>
          }
        />

        {/* Neo-Brutalist Outreach Center */}
        <Route
          path="/outreach"
          element={
            <NeoBrutalistRoute>
              <OutreachCenter />
            </NeoBrutalistRoute>
          }
        />

        {/* Engagement Routes (Events, Tasks, Cases) */}
        {createEngagementRoutes(NeoBrutalistRoute)}

        {/* Finance Routes (Donations, Reconciliation) */}
        {createFinanceRoutes(ProtectedRoute)}

        {/* Analytics Routes */}
        {createAnalyticsRoutes(ProtectedRoute)}

        {/* Workflow Routes */}
        {createWorkflowRoutes(ProtectedRoute)}

        {/* Admin Routes */}
        {createAdminRoutes({ ProtectedRoute, AdminRoute, NeoBrutalistRoute })}

        {/* Builder Routes */}
        {createWebsiteRoutes(ProtectedRoute)}
        {createBuilderRoutes(ProtectedRoute)}
      </Route>

      {/* Neo-Brutalist Demo Routes (No Auth Required) */}
      <Route path="/demo/dashboard" element={<NeoBrutalistDashboard />} />
      <Route path="/demo/linking" element={<LinkingModule />} />
      <Route path="/demo/operations" element={<OperationsBoard />} />
      <Route path="/demo/outreach" element={<OutreachCenter />} />
      <Route path="/demo/people" element={<PeopleDirectory />} />
      <Route path="/demo/audit" element={<ThemeAudit />} />

      {/* Root - Redirects to Neo-Brutalist Dashboard */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
