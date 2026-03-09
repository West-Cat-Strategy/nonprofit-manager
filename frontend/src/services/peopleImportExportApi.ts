import api from './api';
import { buildDownloadedFile, type DownloadedFile } from './fileDownload';

export type PeopleImportEntity = 'accounts' | 'contacts' | 'volunteers';
export type PeopleImportExportFormat = 'csv' | 'xlsx';

export interface ImportFieldOption {
  field: string;
  label: string;
}

export interface ImportFieldCandidate {
  field: string;
  score: number;
  reasons: string[];
}

export interface ImportRowError {
  row_number: number;
  messages: string[];
}

export interface PeopleImportPreview {
  detected_columns: string[];
  mapping: Record<string, string>;
  mapping_candidates: Record<string, ImportFieldCandidate[]>;
  field_options: ImportFieldOption[];
  to_create: number;
  to_update: number;
  total_rows: number;
  row_errors: ImportRowError[];
  warnings: string[];
}

export interface PeopleImportCommitResult {
  created: number;
  updated: number;
  total_processed: number;
  affected_ids: string[];
}

export type PeopleExportRequest = {
  format: PeopleImportExportFormat;
  ids?: string[];
  columns?: string[];
} & Record<string, unknown>;

const buildImportFormData = (
  file: File,
  mapping?: Record<string, string>
): FormData => {
  const formData = new FormData();
  formData.append('file', file);

  if (mapping && Object.keys(mapping).length > 0) {
    formData.append('mapping', JSON.stringify(mapping));
  }

  return formData;
};

export class PeopleImportExportApi {
  async exportEntity(
    entity: PeopleImportEntity,
    request: PeopleExportRequest
  ): Promise<DownloadedFile> {
    const response = await api.post<Blob>(`/v2/${entity}/export`, request, {
      responseType: 'blob',
    });

    return buildDownloadedFile(
      response,
      `${entity}-export-${new Date().toISOString().split('T')[0]}.${request.format}`
    );
  }

  async downloadImportTemplate(
    entity: PeopleImportEntity,
    format: PeopleImportExportFormat
  ): Promise<DownloadedFile> {
    const response = await api.get<Blob>(`/v2/${entity}/import/template`, {
      params: { format },
      responseType: 'blob',
    });

    return buildDownloadedFile(response, `${entity}-import-template.${format}`);
  }

  async previewImport(
    entity: PeopleImportEntity,
    file: File,
    mapping?: Record<string, string>
  ): Promise<PeopleImportPreview> {
    const response = await api.post<PeopleImportPreview>(
      `/v2/${entity}/import/preview`,
      buildImportFormData(file, mapping),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    return response.data;
  }

  async commitImport(
    entity: PeopleImportEntity,
    file: File,
    mapping?: Record<string, string>
  ): Promise<PeopleImportCommitResult> {
    const response = await api.post<PeopleImportCommitResult>(
      `/v2/${entity}/import/commit`,
      buildImportFormData(file, mapping),
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    return response.data;
  }
}

export const peopleImportExportApi = new PeopleImportExportApi();
