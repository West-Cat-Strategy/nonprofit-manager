import { type Pool } from 'pg';
import { VolunteerImportExportUseCaseCoordinator } from './internal/volunteerImportExportCoordinator';

export type {
  VolunteerImportPreview,
  VolunteerImportCommitResult,
} from './volunteerImportExport.types';

export class VolunteerImportExportUseCase {
  private readonly coordinator: VolunteerImportExportUseCaseCoordinator;

  constructor(pool: Pool) {
    this.coordinator = new VolunteerImportExportUseCaseCoordinator(pool);
  }

  async exportVolunteers(
    request: Parameters<VolunteerImportExportUseCaseCoordinator['exportVolunteers']>[0],
    organizationId: Parameters<VolunteerImportExportUseCaseCoordinator['exportVolunteers']>[1],
    scope?: Parameters<VolunteerImportExportUseCaseCoordinator['exportVolunteers']>[2]
  ): ReturnType<VolunteerImportExportUseCaseCoordinator['exportVolunteers']> {
    return this.coordinator.exportVolunteers(request, organizationId, scope);
  }

  async getImportTemplate(
    format: Parameters<VolunteerImportExportUseCaseCoordinator['getImportTemplate']>[0]
  ): ReturnType<VolunteerImportExportUseCaseCoordinator['getImportTemplate']> {
    return this.coordinator.getImportTemplate(format);
  }

  async previewImport(
    file: Parameters<VolunteerImportExportUseCaseCoordinator['previewImport']>[0],
    mapping: Parameters<VolunteerImportExportUseCaseCoordinator['previewImport']>[1],
    organizationId: Parameters<VolunteerImportExportUseCaseCoordinator['previewImport']>[2],
    scope?: Parameters<VolunteerImportExportUseCaseCoordinator['previewImport']>[3]
  ): ReturnType<VolunteerImportExportUseCaseCoordinator['previewImport']> {
    return this.coordinator.previewImport(file, mapping, organizationId, scope);
  }

  async commitImport(
    file: Parameters<VolunteerImportExportUseCaseCoordinator['commitImport']>[0],
    mapping: Parameters<VolunteerImportExportUseCaseCoordinator['commitImport']>[1],
    userId: Parameters<VolunteerImportExportUseCaseCoordinator['commitImport']>[2],
    organizationId: Parameters<VolunteerImportExportUseCaseCoordinator['commitImport']>[3],
    scope?: Parameters<VolunteerImportExportUseCaseCoordinator['commitImport']>[4]
  ): ReturnType<VolunteerImportExportUseCaseCoordinator['commitImport']> {
    return this.coordinator.commitImport(file, mapping, userId, organizationId, scope);
  }
}

export default VolunteerImportExportUseCase;
