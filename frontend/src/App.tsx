import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import { useSetupCheck } from './hooks/useSetupCheck';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import './App.css';

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load all page components for code splitting
const Setup = lazy(() => import('./pages/Setup'));
const Login = lazy(() => import('./pages/Login'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CustomDashboard = lazy(() => import('./pages/CustomDashboard'));

// Account pages
const AccountList = lazy(() => import('./pages/AccountList'));
const AccountDetail = lazy(() => import('./pages/AccountDetail'));
const AccountCreate = lazy(() => import('./pages/AccountCreate').then(m => ({ default: m.AccountCreate })));
const AccountEdit = lazy(() => import('./pages/AccountEdit').then(m => ({ default: m.AccountEdit })));

// Contact pages
const ContactList = lazy(() => import('./pages/ContactList'));
const ContactDetail = lazy(() => import('./pages/ContactDetail'));
const ContactCreate = lazy(() => import('./pages/ContactCreate').then(m => ({ default: m.ContactCreate })));
const ContactEdit = lazy(() => import('./pages/ContactEdit').then(m => ({ default: m.ContactEdit })));

// Volunteer pages
const VolunteerList = lazy(() => import('./pages/VolunteerList'));
const VolunteerDetail = lazy(() => import('./pages/VolunteerDetail'));
const VolunteerCreate = lazy(() => import('./pages/VolunteerCreate').then(m => ({ default: m.VolunteerCreate })));
const VolunteerEdit = lazy(() => import('./pages/VolunteerEdit').then(m => ({ default: m.VolunteerEdit })));
const AssignmentCreate = lazy(() => import('./pages/AssignmentCreate').then(m => ({ default: m.AssignmentCreate })));
const AssignmentEdit = lazy(() => import('./pages/AssignmentEdit').then(m => ({ default: m.AssignmentEdit })));

// Event pages
const EventList = lazy(() => import('./pages/EventList'));
const EventCalendarPage = lazy(() => import('./pages/EventCalendarPage'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const EventCreate = lazy(() => import('./pages/EventCreate'));
const EventEdit = lazy(() => import('./pages/EventEdit'));

// Donation pages
const DonationList = lazy(() => import('./pages/DonationList'));
const DonationDetail = lazy(() => import('./pages/DonationDetail'));
const DonationCreate = lazy(() => import('./pages/DonationCreate'));
const DonationEdit = lazy(() => import('./pages/DonationEdit'));
const DonationPayment = lazy(() => import('./pages/DonationPayment'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));

// Task pages
const TaskList = lazy(() => import('./pages/TaskList'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const TaskCreate = lazy(() => import('./pages/TaskCreate'));
const TaskEdit = lazy(() => import('./pages/TaskEdit'));

// Analytics and Reports pages
const Analytics = lazy(() => import('./pages/Analytics'));
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'));
const SavedReports = lazy(() => import('./pages/SavedReports'));

// Settings and Integration pages
const EmailMarketing = lazy(() => import('./pages/EmailMarketing'));
const ApiSettings = lazy(() => import('./pages/ApiSettings'));
const NavigationSettings = lazy(() => import('./pages/NavigationSettings'));
const UserSettings = lazy(() => import('./pages/UserSettings'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));

// Website Builder pages
const TemplateGallery = lazy(() => import('./pages/TemplateGallery'));
const PageEditor = lazy(() => import('./pages/PageEditor'));
const TemplatePreview = lazy(() => import('./pages/TemplatePreview'));

// Payment Reconciliation pages
const ReconciliationDashboard = lazy(() => import('./pages/ReconciliationDashboard'));

// Case Management pages
const CaseList = lazy(() => import('./pages/CaseList'));
const CaseDetail = lazy(() => import('./pages/CaseDetail'));
const CaseCreate = lazy(() => import('./pages/CaseCreate'));
const CaseEdit = lazy(() => import('./pages/CaseEdit'));

// Neo-Brutalist Demo Pages
const NeoBrutalistDashboard = lazy(() => import('./pages/neo-brutalist/NeoBrutalistDashboard'));
const LinkingModule = lazy(() => import('./pages/neo-brutalist/LinkingModule'));
const OperationsBoard = lazy(() => import('./pages/neo-brutalist/OperationsBoard'));
const OutreachCenter = lazy(() => import('./pages/neo-brutalist/OutreachCenter'));
const PeopleDirectory = lazy(() => import('./pages/neo-brutalist/PeopleDirectory'));

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

const ProtectedRoute = ({ children, isAuthenticated }: ProtectedRouteProps) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

// Neo-Brutalist routes don't use the old Layout (they have their own sidebar layout)
const NeoBrutalistRoute = ({ children, isAuthenticated }: ProtectedRouteProps) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
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
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
      {/* Neo-Brutalist Dashboard (Primary) */}
      <Route
        path="/dashboard"
        element={
          <NeoBrutalistRoute isAuthenticated={isAuthenticated}>
            <NeoBrutalistDashboard />
          </NeoBrutalistRoute>
        }
      />
      <Route
        path="/dashboard/custom"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <CustomDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AccountList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AccountCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts/:id/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AccountEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts/:id"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AccountDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ContactList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ContactCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts/:id/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ContactEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts/:id"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ContactDetail />
          </ProtectedRoute>
        }
      />
      {/* LOOP Module: People Directory */}
      <Route
        path="/people"
        element={
          <NeoBrutalistRoute isAuthenticated={isAuthenticated}>
            <PeopleDirectory />
          </NeoBrutalistRoute>
        }
      />

      {/* LOOP Module: Linking */}
      <Route
        path="/linking"
        element={
          <NeoBrutalistRoute isAuthenticated={isAuthenticated}>
            <LinkingModule />
          </NeoBrutalistRoute>
        }
      />

      {/* LOOP Module: Operations */}
      <Route
        path="/operations"
        element={
          <NeoBrutalistRoute isAuthenticated={isAuthenticated}>
            <OperationsBoard />
          </NeoBrutalistRoute>
        }
      />

      {/* Neo-Brutalist Outreach Center */}
      <Route
        path="/outreach"
        element={
          <NeoBrutalistRoute isAuthenticated={isAuthenticated}>
            <OutreachCenter />
          </NeoBrutalistRoute>
        }
      />

      {/* Legacy Volunteer Routes (kept for backwards compatibility) */}
      <Route
        path="/volunteers"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <VolunteerList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <VolunteerCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers/:id/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <VolunteerEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers/:volunteerId/assignments/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AssignmentCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers/:volunteerId/assignments/:assignmentId/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <AssignmentEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers/:id"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <VolunteerDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <EventList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/calendar"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <EventCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <EventCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <EventEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <EventDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DonationList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DonationCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations/:id/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DonationEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations/:id"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DonationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations/payment"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <DonationPayment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/donations/payment-result"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <PaymentResult />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reconciliation"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ReconciliationDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <CaseList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <CaseCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <CaseEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cases/:id"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <CaseDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TaskList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TaskCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id/edit"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TaskEdit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TaskDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/builder"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ReportBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports/saved"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <SavedReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Navigate to="/reports/builder" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/email-marketing"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <EmailMarketing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/api"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <ApiSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/navigation"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <NavigationSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/user"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <UserSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/admin"
        element={
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        }
      />
      <Route
        path="/website-builder"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TemplateGallery />
          </ProtectedRoute>
        }
      />
      <Route
        path="/website-builder/:templateId/preview"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <TemplatePreview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/website-builder/:templateId"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <PageEditor />
          </ProtectedRoute>
        }
      />
      {/* Neo-Brutalist Demo Routes (No Auth Required) */}
      <Route path="/demo/dashboard" element={<NeoBrutalistDashboard />} />
      <Route path="/demo/linking" element={<LinkingModule />} />
      <Route path="/demo/operations" element={<OperationsBoard />} />
      <Route path="/demo/outreach" element={<OutreachCenter />} />
      <Route path="/demo/people" element={<PeopleDirectory />} />

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
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<PageLoader />}>
          <AppRoutes />
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
