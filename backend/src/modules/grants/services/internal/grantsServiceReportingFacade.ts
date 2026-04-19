import {
  type CreateGrantDocumentDTO,
  type CreateGrantReportDTO,
  type GrantActivityLog,
  type GrantCalendarItem,
  type GrantDocument,
  type GrantListFilters,
  type GrantReport,
  type PaginatedGrantResult,
  type UpdateGrantDocumentDTO,
  type UpdateGrantReportDTO,
} from '@app-types/grant';
import { GrantsReportingService } from '../grantsReportingService';

export class GrantsServiceReportingFacade {
  constructor(private readonly reportingService: GrantsReportingService) {}

  async listReports(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantReport>> {
    return this.reportingService.listReports(organizationId, filters);
  }

  async getReportById(organizationId: string, id: string): Promise<GrantReport | null> {
    return this.reportingService.getReportById(organizationId, id);
  }

  async createReport(
    organizationId: string,
    userId: string,
    data: CreateGrantReportDTO
  ): Promise<GrantReport> {
    return this.reportingService.createReport(organizationId, userId, data);
  }

  async updateReport(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantReportDTO
  ): Promise<GrantReport | null> {
    return this.reportingService.updateReport(organizationId, id, userId, data);
  }

  async deleteReport(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.reportingService.deleteReport(organizationId, id, userId);
  }

  async listDocuments(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantDocument>> {
    return this.reportingService.listDocuments(organizationId, filters);
  }

  async getDocumentById(organizationId: string, id: string): Promise<GrantDocument | null> {
    return this.reportingService.getDocumentById(organizationId, id);
  }

  async createDocument(
    organizationId: string,
    userId: string,
    data: CreateGrantDocumentDTO
  ): Promise<GrantDocument> {
    return this.reportingService.createDocument(organizationId, userId, data);
  }

  async updateDocument(
    organizationId: string,
    id: string,
    userId: string,
    data: UpdateGrantDocumentDTO
  ): Promise<GrantDocument | null> {
    return this.reportingService.updateDocument(organizationId, id, userId, data);
  }

  async deleteDocument(organizationId: string, id: string, userId: string | null): Promise<boolean> {
    return this.reportingService.deleteDocument(organizationId, id, userId);
  }

  async listActivities(
    organizationId: string,
    filters: GrantListFilters = {}
  ): Promise<PaginatedGrantResult<GrantActivityLog>> {
    return this.reportingService.listActivities(organizationId, filters);
  }

  async getCalendar(
    organizationId: string,
    options: { start_date?: string; end_date?: string; limit?: number } = {}
  ): Promise<GrantCalendarItem[]> {
    return this.reportingService.getCalendar(organizationId, options);
  }
}
