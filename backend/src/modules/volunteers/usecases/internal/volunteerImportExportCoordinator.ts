import { type Pool } from 'pg';
import type { DataScopeFilter } from '@app-types/dataScope';
import { parsePeopleImportFile } from '@modules/shared/import/peopleImportParser';
import type {
  VolunteerExportRequest,
  VolunteerImportCommitResult,
  VolunteerImportPlan,
  VolunteerImportPreview,
} from '../volunteerImportExport.types';
import { buildVolunteerImportPreview } from '../volunteerImportExport.utils';
import { analyzeVolunteerImport } from './volunteerImportExport.analysis';
import { commitVolunteerImport } from './volunteerImportExport.commit';
import {
  exportVolunteers as exportVolunteerFile,
  getVolunteerImportTemplate,
} from './volunteerImportExport.export';

export type { VolunteerImportCommitResult, VolunteerImportPreview } from '../volunteerImportExport.types';

export class VolunteerImportExportUseCaseCoordinator {
  constructor(private readonly pool: Pool) {}

  async exportVolunteers(
    request: VolunteerExportRequest,
    organizationId: string,
    scope?: DataScopeFilter
  ) {
    return exportVolunteerFile(this.pool, request, organizationId, scope);
  }

  async getImportTemplate(format: 'csv' | 'xlsx') {
    return getVolunteerImportTemplate(format);
  }

  async previewImport(
    file: Express.Multer.File,
    mapping: Record<string, unknown> | undefined,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<VolunteerImportPreview> {
    const plan = await this.parseAndAnalyzeImport(file, mapping, organizationId, scope);
    return buildVolunteerImportPreview(plan.parsed, plan.analysis);
  }

  async commitImport(
    file: Express.Multer.File,
    mapping: Record<string, unknown> | undefined,
    userId: string,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<VolunteerImportCommitResult> {
    const plan = await this.parseAndAnalyzeImport(file, mapping, organizationId, scope);
    return commitVolunteerImport({
      pool: this.pool,
      analysis: plan.analysis,
      organizationId,
      userId,
    });
  }

  private async parseAndAnalyzeImport(
    file: Express.Multer.File,
    mapping: Record<string, unknown> | undefined,
    organizationId: string,
    scope?: DataScopeFilter
  ): Promise<VolunteerImportPlan> {
    const parsed = await parsePeopleImportFile(file, 'volunteers', mapping);
    const analysis = await analyzeVolunteerImport(parsed, organizationId, scope, this.pool);
    return { parsed, analysis };
  }
}

export default VolunteerImportExportUseCaseCoordinator;
