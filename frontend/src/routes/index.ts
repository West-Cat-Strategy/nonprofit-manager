/**
 * Routes Index
 * Barrel exports for all route modules
 */

export { authRoutes } from './authRoutes';
export { Setup, Login, AcceptInvitation } from './authRouteComponents';

export { createPeopleRoutes } from './peopleRoutes';
export {
  AccountList,
  AccountDetail,
  AccountCreate,
  AccountEdit,
  ContactList,
  ContactDetail,
  ContactCreate,
  ContactEdit,
  VolunteerList,
  VolunteerDetail,
  VolunteerCreate,
  VolunteerEdit,
  AssignmentCreate,
  AssignmentEdit,
} from './peopleRouteComponents';

export { createEngagementRoutes } from './engagementRoutes';
export {
  EventList,
  EventDetail,
  EventCreate,
  EventEdit,
  EventCalendarPage,
  TaskList,
  TaskDetail,
  TaskCreate,
  TaskEdit,
  CaseList,
  CaseDetail,
  CaseCreate,
  CaseEdit,
} from './engagementRouteComponents';

export { createFinanceRoutes } from './financeRoutes';
export {
  DonationList,
  DonationDetail,
  DonationCreate,
  DonationEdit,
  DonationPayment,
  PaymentResult,
  ReconciliationDashboard,
} from './financeRouteComponents';

export { createAnalyticsRoutes } from './analyticsRoutes';
export {
  Analytics,
  CustomDashboard,
  ReportBuilder,
  SavedReports,
} from './analyticsRouteComponents';

export { createAdminRoutes } from './adminRoutes';
export {
  AdminSettings,
  UserSettings,
  ApiSettings,
  AlertsConfig,
  NavigationSettings,
  DataBackup,
  EmailMarketing,
} from './adminRouteComponents';

export { createBuilderRoutes } from './builderRoutes';
export {
  TemplateGallery,
  PageEditor,
  TemplatePreview,
} from './builderRouteComponents';

export { createPortalRoutes } from './portalRoutes';
export {
  PortalLogin,
  PortalSignup,
  PortalAcceptInvitation,
  PortalDashboard,
  PortalProfile,
  PortalPeople,
  PortalEvents,
  PortalAppointments,
  PortalDocuments,
  PortalNotes,
  PortalForms,
  PortalReminders,
} from './portalRouteComponents';

export { createWorkflowRoutes } from './workflowRoutes';
export { IntakeNew, InteractionNote } from './workflowRouteComponents';
