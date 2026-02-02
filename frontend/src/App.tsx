import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
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
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

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

// Website Builder pages
const TemplateGallery = lazy(() => import('./pages/TemplateGallery'));
const PageEditor = lazy(() => import('./pages/PageEditor'));
const TemplatePreview = lazy(() => import('./pages/TemplatePreview'));

// Payment Reconciliation pages
const ReconciliationDashboard = lazy(() => import('./pages/ReconciliationDashboard'));

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

const ProtectedRoute = ({ children, isAuthenticated }: ProtectedRouteProps) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  <Dashboard />
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
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
