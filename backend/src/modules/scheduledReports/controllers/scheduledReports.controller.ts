import { scheduledReportController } from '@controllers/scheduledReportController';
import { ScheduledReportsUseCase } from '../usecases/scheduledReports.usecase';
import type { ResponseMode } from '../mappers/responseMode';

export const createScheduledReportsController = (
  useCase: ScheduledReportsUseCase,
  mode: ResponseMode
) => {
  void mode;
  useCase.getDomain();

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
