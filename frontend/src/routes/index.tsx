import { lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useSetupCheck } from '../hooks/useSetupCheck';
import AdminRoute from '../components/AdminRoute';
import PortalProtectedRoute from '../components/PortalProtectedRoute';
import { ProtectedRoute, NeoBrutalistRoute } from '../components/auth';
import PageLoader from '../components/PageLoader';

// Import route creators
import { createPeopleRoutes } from './peopleRoutes';
import { createEngagementRoutes } from './engagementRoutes';
import { createFinanceRoutes } from './financeRoutes';
import { createAnalyticsRoutes } from './analyticsRoutes';
import { createAdminRoutes } from './adminRoutes';
import { createBuilderRoutes } from './builderRoutes';
import { createPortalRoutes } from './portalRoutes';
import { createWorkflowRoutes } from './workflowRoutes';

// Lazy load auth pages
const Setup = lazy(() => import('../pages/auth/Setup'));
const Login = lazy(() => import('../pages/auth/Login'));
const AcceptInvitation = lazy(() => import('../pages/auth/AcceptInvitation'));

// Lazy load Neo-Brutalist pages (remain in their directory)
const NeoBrutalistDashboard = lazy(() => import('../pages/neo-brutalist/NeoBrutalistDashboard'));
const LinkingModule = lazy(() => import('../pages/neo-brutalist/LinkingModule'));
const OperationsBoard = lazy(() => import('../pages/neo-brutalist/OperationsBoard'));
const OutreachCenter = lazy(() => import('../pages/neo-brutalist/OutreachCenter'));
const PeopleDirectory = lazy(() => import('../pages/neo-brutalist/PeopleDirectory'));
const ThemeAudit = lazy(() => import('../pages/neo-brutalist/ThemeAudit'));

// AppRoutes component with setup check logic
const AppRoutes = () => {
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);
  const { setupRequired, loading } = useSetupCheck();
  const location = useLocation();

  // Show loader while verifying auth cookie or checking setup status
  if (authLoading || loading) {
    return <PageLoader />;
  }

  // Redirect to setup if required and not already on setup page
  if (setupRequired && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  // Redirect to login if setup is complete but user tries to access setup page
  if (!setupRequired && location.pathname === '/setup') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

      {/* Portal Routes */}
      {createPortalRoutes(PortalProtectedRoute)}

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
      {createBuilderRoutes(ProtectedRoute)}

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
