/**
 * Routes Index
 * Barrel exports for all route modules
 */

export { authRoutes, Setup, Login, AcceptInvitation } from './authRoutes';
export {
  createPeopleRoutes,
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
} from './peopleRoutes';
export {
  createEngagementRoutes,
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
} from './engagementRoutes';
export {
  createFinanceRoutes,
  DonationList,
  DonationDetail,
  DonationCreate,
  DonationEdit,
  DonationPayment,
  PaymentResult,
  ReconciliationDashboard,
} from './financeRoutes';
export {
  createAnalyticsRoutes,
  Analytics,
  CustomDashboard,
  ReportBuilder,
  SavedReports,
} from './analyticsRoutes';
export {
  createAdminRoutes,
  AdminSettings,
  UserSettings,
  ApiSettings,
  AlertsConfig,
  NavigationSettings,
  DataBackup,
  EmailMarketing,
} from './adminRoutes';
export {
  createBuilderRoutes,
  TemplateGallery,
  PageEditor,
  TemplatePreview,
} from './builderRoutes';
export {
  createPortalRoutes,
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
} from './portalRoutes';
export {
  createWorkflowRoutes,
  IntakeNew,
  InteractionNote,
} from './workflowRoutes';
