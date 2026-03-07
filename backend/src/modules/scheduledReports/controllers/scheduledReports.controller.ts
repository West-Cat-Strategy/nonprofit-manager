import { scheduledReportController } from './scheduledReport.handlers';

export const createScheduledReportsController = () => {
  return {
    listScheduledReports: scheduledReportController.listScheduledReports,
    getScheduledReport: scheduledReportController.getScheduledReport,
    createScheduledReport: scheduledReportController.createScheduledReport,
    updateScheduledReport: scheduledReportController.updateScheduledReport,
    toggleScheduledReport: scheduledReportController.toggleScheduledReport,
    runScheduledReportNow: scheduledReportController.runScheduledReportNow,
    deleteScheduledReport: scheduledReportController.deleteScheduledReport,
    listScheduledReportRuns: scheduledReportController.listScheduledReportRuns,
  };
};
