import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import { useSetupCheck } from './hooks/useSetupCheck';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import PortalProtectedRoute from './components/PortalProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import ToastHost from './components/ToastHost';
import './App.css';

// Import route creators
import { createPeopleRoutes } from './routes/peopleRoutes';
import { createEngagementRoutes } from './routes/engagementRoutes';
import { createFinanceRoutes } from './routes/financeRoutes';
import { createAnalyticsRoutes } from './routes/analyticsRoutes';
import { createAdminRoutes } from './routes/adminRoutes';
import { createBuilderRoutes } from './routes/builderRoutes';
import { createPortalRoutes } from './routes/portalRoutes';
import { createWorkflowRoutes } from './routes/workflowRoutes';

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load auth pages
const Setup = lazy(() => import('./pages/auth/Setup'));
const Login = lazy(() => import('./pages/auth/Login'));
const AcceptInvitation = lazy(() => import('./pages/auth/AcceptInvitation'));

// Lazy load Neo-Brutalist pages (remain in their directory)
const NeoBrutalistDashboard = lazy(() => import('./pages/neo-brutalist/NeoBrutalistDashboard'));
const LinkingModule = lazy(() => import('./pages/neo-brutalist/LinkingModule'));
const OperationsBoard = lazy(() => import('./pages/neo-brutalist/OperationsBoard'));
const OutreachCenter = lazy(() => import('./pages/neo-brutalist/OutreachCenter'));
const PeopleDirectory = lazy(() => import('./pages/neo-brutalist/PeopleDirectory'));
const ThemeAudit = lazy(() => import('./pages/neo-brutalist/ThemeAudit'));

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRouteWrapper = ({ children, isAuthenticated }: ProtectedRouteProps & { isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

// Neo-Brutalist routes don't use the old Layout (they have their own sidebar layout)
const NeoBrutalistRouteWrapper = ({ children, isAuthenticated }: ProtectedRouteProps & { isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return <ProtectedRouteWrapper isAuthenticated={isAuthenticated}>{children}</ProtectedRouteWrapper>;
};

const NeoBrutalistRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return <NeoBrutalistRouteWrapper isAuthenticated={isAuthenticated}>{children}</NeoBrutalistRouteWrapper>;
};

// AppRoutes component with setup check logic
const AppRoutes = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { setupRequired, loading } = useSetupCheck();
  const location = useLocation();

  // Show loader while checking setup status
  if (loading) {
    return <PageLoader />;
  }

  // Redirect to setup if required and not already on setup page
  if (setupRequired && location.pathname !== '/setup') {
    // Clear any old tokens before redirecting to setup
    localStorage.removeItem('token');
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
      {createEngagementRoutes(ProtectedRoute)}

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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-300">
        <ThemeProvider>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
          <ToastHost />
        </ThemeProvider>
      </div>
    </Router>
  );
}

export default App;
