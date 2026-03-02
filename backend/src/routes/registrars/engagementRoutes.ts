import { Application } from 'express';
import {
  accountRoutes,
  activityRoutes,
  alertRoutes,
  analyticsRoutes,
  caseRoutes,
  contactRoutes,
  dashboardRoutes,
  donationRoutes,
  externalServiceProviderRoutes,
  followUpRoutes,
  invitationRoutes,
  mailchimpRoutes,
  meetingRoutes,
  reportRoutes,
  savedReportRoutes,
  scheduledReportRoutes,
  taskRoutes,
  volunteerRoutes,
  webhookRoutes,
} from '@routes/domains/engagement';
import { opportunitiesApiRoutes } from '@modules/opportunities';

export function registerEngagementRoutes(app: Application): void {
  app.use('/api/accounts', accountRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/volunteers', volunteerRoutes);
  app.use('/api/donations', donationRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/follow-ups', followUpRoutes);
  app.use('/api/scheduled-reports', scheduledReportRoutes);
  app.use('/api/opportunities', opportunitiesApiRoutes);
  app.use('/api/external-service-providers', externalServiceProviderRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/saved-reports', savedReportRoutes);
  app.use('/api/cases', caseRoutes);
  app.use('/api/mailchimp', mailchimpRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/invitations', invitationRoutes);
  app.use('/api/meetings', meetingRoutes);
}
