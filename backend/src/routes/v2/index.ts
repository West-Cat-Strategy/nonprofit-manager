import { Router, Application } from 'express';
import { authenticate } from '@middleware/domains/auth';
import { captureRequestedOrganizationContext } from '@middleware/orgContext';
import { requireWorkspaceModuleEnabled } from '@middleware/requireWorkspaceModuleEnabled';
import { portalV2Routes } from '@modules/portal';
import { eventsV2Routes, publicEventsV2Routes } from '@modules/events';
import { casesV2Routes, publicCaseFormsV2Routes } from '@modules/cases';
import { contactsV2Routes } from '@modules/contacts';
import { opportunitiesV2Routes } from '@modules/opportunities';
import { teamChatV2Routes } from '@modules/teamChat';
import { accountsV2Routes } from '@modules/accounts';
import { volunteersV2Routes } from '@modules/volunteers';
import { tasksV2Routes } from '@modules/tasks';
import { analyticsV2Routes } from '@modules/analytics';
import { reportsV2Routes } from '@modules/reports';
import { savedReportsV2Routes } from '@modules/savedReports';
import { scheduledReportsV2Routes } from '@modules/scheduledReports';
import { dashboardV2Routes } from '@modules/dashboard';
import { followUpsV2Routes } from '@modules/followUps';
import { activitiesV2Routes } from '@modules/activities';
import { adminV2Routes } from '@modules/admin';
import { alertsV2Routes } from '@modules/alerts';
import { authV2Routes } from '@modules/auth';
import { backupV2Routes } from '@modules/backup';
import { donationsV2Routes } from '@modules/donations';
import { grantsV2Routes } from '@modules/grants';
import { exportV2Routes } from '@modules/export';
import { externalServiceProvidersV2Routes } from '@modules/externalServiceProviders';
import { ingestV2Routes } from '@modules/ingest';
import { invitationsV2Routes } from '@modules/invitations';
import { mailchimpV2Routes } from '@modules/mailchimp';
import { meetingsV2Routes } from '@modules/meetings';
import { paymentsV2Routes } from '@modules/payments';
import { recurringDonationsV2Routes } from '@modules/recurringDonations';
import { plausibleProxyV2Routes } from '@modules/plausibleProxy';
import { publicReportsV2Routes } from '@modules/publicReports';
import { reconciliationV2Routes } from '@modules/reconciliation';
import { socialMediaV2Routes } from '@modules/socialMedia';
import {
  publishingV2Routes,
  publicPublishingV2Routes,
  publicWebsiteFormsV2Routes,
} from '@modules/publishing';
import { templatesV2Routes } from '@modules/templates';
import { usersV2Routes } from '@modules/users';
import { webhooksV2Routes } from '@modules/webhooks';
import { portalAuthV2Routes } from '@modules/portalAuth';
import { portalAdminV2Routes } from '@modules/portalAdmin';
import type { WorkspaceModuleKey } from '@app-types/workspaceModules';

export const apiV2Routes = Router();

const mountV2Routes = (
  path: string,
  router: Router,
  options?: {
    authenticate?: boolean;
    workspaceModuleKey?: WorkspaceModuleKey;
  }
): void => {
  const middleware = [captureRequestedOrganizationContext];

  if (options?.authenticate) {
    middleware.push(authenticate);
  }

  if (options?.workspaceModuleKey) {
    middleware.push(requireWorkspaceModuleEnabled(options.workspaceModuleKey));
  }

  apiV2Routes.use(path, ...middleware, router);
};

const mountWorkspaceModuleRoutes = (
  path: string,
  moduleKey: WorkspaceModuleKey,
  router: Router
): void => {
  mountV2Routes(path, router, {
    authenticate: true,
    workspaceModuleKey: moduleKey,
  });
};

mountV2Routes('/auth', authV2Routes);
mountV2Routes('/users', usersV2Routes);
mountV2Routes('/ingest', ingestV2Routes);
mountV2Routes('/admin', adminV2Routes);
mountV2Routes('/backup', backupV2Routes);
mountV2Routes('/plausible', plausibleProxyV2Routes);
mountV2Routes('/activities', activitiesV2Routes);
mountV2Routes('/export', exportV2Routes);
mountV2Routes('/invitations', invitationsV2Routes);
mountV2Routes('/mailchimp', mailchimpV2Routes);
mountV2Routes('/meetings', meetingsV2Routes);
mountV2Routes('/payments', paymentsV2Routes);
mountV2Routes('/public/events', publicEventsV2Routes);
mountV2Routes('/public/newsletters', publicPublishingV2Routes);
mountV2Routes('/public/forms', publicWebsiteFormsV2Routes);
mountV2Routes('/public/case-forms', publicCaseFormsV2Routes);
mountV2Routes('/public/reports', publicReportsV2Routes);
mountV2Routes('/social-media', socialMediaV2Routes);
mountV2Routes('/sites', publishingV2Routes);
mountV2Routes('/templates', templatesV2Routes);
mountV2Routes('/webhooks', webhooksV2Routes);
mountV2Routes('/portal/auth', portalAuthV2Routes);
mountV2Routes('/portal/admin', portalAdminV2Routes);
mountV2Routes('/portal', portalV2Routes);
mountWorkspaceModuleRoutes('/events', 'events', eventsV2Routes);
mountWorkspaceModuleRoutes('/accounts', 'accounts', accountsV2Routes);
mountWorkspaceModuleRoutes('/volunteers', 'volunteers', volunteersV2Routes);
mountWorkspaceModuleRoutes('/tasks', 'tasks', tasksV2Routes);
mountWorkspaceModuleRoutes('/analytics', 'analytics', analyticsV2Routes);
mountWorkspaceModuleRoutes('/reports', 'reports', reportsV2Routes);
mountWorkspaceModuleRoutes('/saved-reports', 'reports', savedReportsV2Routes);
mountWorkspaceModuleRoutes('/scheduled-reports', 'scheduledReports', scheduledReportsV2Routes);
mountV2Routes('/dashboard', dashboardV2Routes);
mountWorkspaceModuleRoutes('/follow-ups', 'followUps', followUpsV2Routes);
mountWorkspaceModuleRoutes('/cases', 'cases', casesV2Routes);
mountWorkspaceModuleRoutes('/contacts', 'contacts', contactsV2Routes);
mountWorkspaceModuleRoutes('/opportunities', 'opportunities', opportunitiesV2Routes);
mountWorkspaceModuleRoutes('/team-chat', 'teamChat', teamChatV2Routes);
mountWorkspaceModuleRoutes(
  '/external-service-providers',
  'externalServiceProviders',
  externalServiceProvidersV2Routes
);
mountWorkspaceModuleRoutes('/donations', 'donations', donationsV2Routes);
mountWorkspaceModuleRoutes('/grants', 'grants', grantsV2Routes);
mountWorkspaceModuleRoutes(
  '/recurring-donations',
  'recurringDonations',
  recurringDonationsV2Routes
);
mountWorkspaceModuleRoutes('/reconciliation', 'reconciliation', reconciliationV2Routes);
mountWorkspaceModuleRoutes('/alerts', 'alerts', alertsV2Routes);

export function registerV2Routes(app: Application): void {
  const v2Enabled = process.env.API_V2_ENABLED !== 'false';
  if (!v2Enabled) {
    return;
  }

  app.use('/api/v2', apiV2Routes);
}
