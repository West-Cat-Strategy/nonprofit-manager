import { lazy } from 'react';
import { SavedReportsRoutePage } from '../../savedReports/routeComponents';

export const ReportBuilderRoutePage = lazy(() => import('../pages/ReportBuilderPage'));
export const ReportTemplatesRoutePage = lazy(() => import('../pages/ReportTemplatesPage'));
export { SavedReportsRoutePage };
export const ScheduledReportsRoutePage = lazy(
  () => import('../../scheduledReports/pages/ScheduledReportsPage')
);
export const WorkflowCoverageRoutePage = lazy(
  () => import('../pages/WorkflowCoverageReportPage')
);
export const OutcomesReportRoutePage = lazy(() => import('../pages/OutcomesReportPage'));
