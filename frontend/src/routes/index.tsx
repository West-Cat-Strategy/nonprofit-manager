import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import AdminRoute from '../components/AdminRoute';
import PortalShellRoute from '../components/PortalShellRoute';
import PublicShellRoute from '../components/PublicShellRoute';
import { ProtectedRoute, NeoBrutalistRoute } from '../components/auth';
import AuthenticatedShellRoute from '../components/auth/AuthenticatedShellRoute';
import PageLoader from '../components/PageLoader';
import {
  AcceptInvitation,
  AdminRegistrationReview,
  ForgotPassword,
  Login,
  Register,
  ResetPassword,
  Setup,
} from '../features/auth/routeComponents';
import {
  LinkingModule,
  OperationsBoard,
  OutreachCenter,
  PeopleDirectory,
  ThemeAudit,
} from '../features/neoBrutalist/routeComponents';
import { WorkbenchDashboard } from '../features/dashboard/routeComponents';
import { PublicReportSnapshot } from '../features/savedReports/routeComponents';
import { logout } from '../features/auth/state';
import { portalLogout } from '../features/portalAuth/state';
import { PublicEventCheckInPage, PublicEventsPage } from '../features/events/routeComponents';
import { RecurringDonationCheckoutResult } from '../features/finance/routeComponents';

// Import route creators
import { createPeopleRoutes, createStandalonePeopleRoutes } from './peopleRoutes';
import { createEngagementRoutes } from './engagementRoutes';
import { createFinanceRoutes } from './financeRoutes';
import { createGrantsRoutes } from './grantsRoutes';
import { createAnalyticsRoutes } from './analyticsRoutes';
import { createAdminRoutes } from './adminRoutes';
import { createBuilderRoutes } from './builderRoutes';
import { createWebsiteRoutes } from './websiteRoutes';
import { createPortalProtectedRoutes, createPortalPublicRoutes } from './portalRoutes';
import { createWorkflowRoutes } from './workflowRoutes';

// AppRoutes component with setup check logic
const AppRoutes = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

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
        <Route path="/admin-registration-review/:token" element={<AdminRegistrationReview />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/public/reports/:token" element={<PublicReportSnapshot />} />
        <Route path="/public/events/:site" element={<PublicEventsPage />} />
        <Route path="/event-check-in/:id" element={<PublicEventCheckInPage />} />
        <Route
          path="/recurring-donations/checkout-result"
          element={<RecurringDonationCheckoutResult />}
        />
        {createStandalonePeopleRoutes(ProtectedRoute)}
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
              <WorkbenchDashboard />
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

        {/* Grants Routes */}
        {createGrantsRoutes(ProtectedRoute)}

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
      <Route path="/demo/dashboard" element={<WorkbenchDashboard />} />
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
