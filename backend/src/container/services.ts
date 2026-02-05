/**
 * Service Container
 * Centralized dependency injection container for all services
 *
 * This provides a single location for service instantiation, making it easy to:
 * 1. Swap implementations for testing
 * 2. Manage service lifecycles
 * 3. Share database connections
 */

import { Pool } from 'pg';
import pool from '../config/database';

// Service imports
import { DonationService } from '../services/donationService';
import { TaskService } from '../services/taskService';
import { CaseService } from '../services/caseService';
import { EventService } from '../services/eventService';
import { AccountService } from '../services/accountService';
import { ContactService } from '../services/contactService';
import { VolunteerService } from '../services/volunteerService';
import { ContactRoleService } from '../services/contactRoleService';
import { AlertService } from '../services/alertService';
import { AnalyticsService } from '../services/analyticsService';
import { BackupService } from '../services/backupService';
import { DashboardService } from '../services/dashboardService';
import { ExportService } from '../services/exportService';
import { ReportService } from '../services/reportService';
import { SavedReportService } from '../services/savedReportService';

/**
 * Service container interface
 */
export interface ServiceContainer {
  readonly pool: Pool;
  readonly donation: DonationService;
  readonly task: TaskService;
  readonly case: CaseService;
  readonly event: EventService;
  readonly account: AccountService;
  readonly contact: ContactService;
  readonly volunteer: VolunteerService;
  readonly contactRole: ContactRoleService;
  readonly alert: AlertService;
  readonly analytics: AnalyticsService;
  readonly backup: BackupService;
  readonly dashboard: DashboardService;
  readonly export: ExportService;
  readonly report: ReportService;
  readonly savedReport: SavedReportService;
}

/**
 * Create a service container with the given database pool
 * This allows for easy testing by injecting a mock pool
 */
export function createServiceContainer(dbPool: Pool = pool): ServiceContainer {
  // Cache service instances for reuse
  let donationService: DonationService | null = null;
  let taskService: TaskService | null = null;
  let caseService: CaseService | null = null;
  let eventService: EventService | null = null;
  let accountService: AccountService | null = null;
  let contactService: ContactService | null = null;
  let volunteerService: VolunteerService | null = null;
  let contactRoleService: ContactRoleService | null = null;
  let alertService: AlertService | null = null;
  let analyticsService: AnalyticsService | null = null;
  let backupService: BackupService | null = null;
  let dashboardService: DashboardService | null = null;
  let exportService: ExportService | null = null;
  let reportService: ReportService | null = null;
  let savedReportService: SavedReportService | null = null;

  return {
    get pool() {
      return dbPool;
    },

    get donation() {
      if (!donationService) {
        donationService = new DonationService(dbPool);
      }
      return donationService;
    },

    get task() {
      if (!taskService) {
        taskService = new TaskService(dbPool);
      }
      return taskService;
    },

    get case() {
      if (!caseService) {
        caseService = new CaseService(dbPool);
      }
      return caseService;
    },

    get event() {
      if (!eventService) {
        eventService = new EventService(dbPool);
      }
      return eventService;
    },

    get account() {
      if (!accountService) {
        accountService = new AccountService(dbPool);
      }
      return accountService;
    },

    get contact() {
      if (!contactService) {
        contactService = new ContactService(dbPool);
      }
      return contactService;
    },

    get volunteer() {
      if (!volunteerService) {
        volunteerService = new VolunteerService(dbPool);
      }
      return volunteerService;
    },

    get contactRole() {
      if (!contactRoleService) {
        contactRoleService = new ContactRoleService(dbPool);
      }
      return contactRoleService;
    },

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
  };
}

/**
 * Default service container instance
 * Use this for production code
 */
export const services = createServiceContainer();

/**
 * Type helper for getting service types
 */
export type Services = typeof services;
