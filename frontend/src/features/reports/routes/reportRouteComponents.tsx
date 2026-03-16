import { lazy } from 'react';

export const ReportBuilderRoutePage = lazy(() => import('../pages/ReportBuilderPage'));
export const ReportTemplatesRoutePage = lazy(() => import('../pages/ReportTemplatesPage'));
export const SavedReportsRoutePage = lazy(() => import('../../savedReports/pages/SavedReportsPage'));
export const ScheduledReportsRoutePage = lazy(
  () => import('../../scheduledReports/pages/ScheduledReportsPage')
);
export const WorkflowCoverageRoutePage = lazy(
  () => import('../pages/WorkflowCoverageReportPage')
);
export const OutcomesReportRoutePage = lazy(() => import('../pages/OutcomesReportPage'));
