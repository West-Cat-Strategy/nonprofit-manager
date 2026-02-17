import { Pool } from 'pg';
import {
  AlertService,
  AnalyticsService,
  BackupService,
  DashboardService,
  ExportService,
  ReportService,
  SavedReportService,
} from '@services/domains/operations';
import { ReportTemplateService } from '@services/reportTemplateService';

export interface OperationsProviders {
  readonly alert: AlertService;
  readonly analytics: AnalyticsService;
  readonly backup: BackupService;
  readonly dashboard: DashboardService;
  readonly export: ExportService;
  readonly report: ReportService;
  readonly savedReport: SavedReportService;
  readonly reportTemplate: ReportTemplateService;
}

export function createOperationsProviders(dbPool: Pool): OperationsProviders {
  let alertService: AlertService | null = null;
  let analyticsService: AnalyticsService | null = null;
  let backupService: BackupService | null = null;
  let dashboardService: DashboardService | null = null;
  let exportService: ExportService | null = null;
  let reportService: ReportService | null = null;
  let savedReportService: SavedReportService | null = null;
  let reportTemplateService: ReportTemplateService | null = null;

  return {
    get alert() {
      if (!alertService) {
        alertService = new AlertService(dbPool);
      }
      return alertService;
    },
    get analytics() {
      if (!analyticsService) {
        analyticsService = new AnalyticsService(dbPool);
      }
      return analyticsService;
    },
    get backup() {
      if (!backupService) {
        backupService = new BackupService();
      }
      return backupService;
    },
    get dashboard() {
      if (!dashboardService) {
        dashboardService = new DashboardService(dbPool);
      }
      return dashboardService;
    },
    get export() {
      if (!exportService) {
        exportService = new ExportService();
      }
      return exportService;
    },
    get report() {
      if (!reportService) {
        reportService = new ReportService(dbPool);
      }
      return reportService;
    },
    get savedReport() {
      if (!savedReportService) {
        savedReportService = new SavedReportService(dbPool);
      }
      return savedReportService;
    },
    get reportTemplate() {
      if (!reportTemplateService) {
        reportTemplateService = new ReportTemplateService(dbPool);
      }
      return reportTemplateService;
    },
  };
}
