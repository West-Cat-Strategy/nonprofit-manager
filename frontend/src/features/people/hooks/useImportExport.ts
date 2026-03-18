import { useCallback, useState } from 'react';
import {
  peopleImportExportApi,
  type PeopleExportRequest,
  type PeopleImportCommitResult,
  type PeopleImportEntity,
  type PeopleImportExportFormat,
  type PeopleImportPreview,
} from '../services/peopleImportExportApi';
import { triggerFileDownload } from '../../../services/fileDownload';

interface UseImportExportReturn {
  exportEntity: (
    entity: PeopleImportEntity,
    request: PeopleExportRequest
  ) => Promise<void>;
  downloadImportTemplate: (
    entity: PeopleImportEntity,
    format: PeopleImportExportFormat
  ) => Promise<void>;
  previewImport: (
    entity: PeopleImportEntity,
    file: File,
    mapping?: Record<string, string>
  ) => Promise<PeopleImportPreview>;
  commitImport: (
    entity: PeopleImportEntity,
    file: File,
    mapping?: Record<string, string>
  ) => Promise<PeopleImportCommitResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const useImportExport = (): UseImportExportReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(action: () => Promise<T>, fallback: string): Promise<T> => {
    setIsLoading(true);
    setError(null);

    try {
      return await action();
    } catch (actionError) {
      const message = getErrorMessage(actionError, fallback);
      setError(message);
      throw actionError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportEntity = useCallback(
    async (entity: PeopleImportEntity, request: PeopleExportRequest): Promise<void> =>
      run(async () => {
        const file = await peopleImportExportApi.exportEntity(entity, request);
        triggerFileDownload(file);
      }, 'Export failed'),
    [run]
  );

  const downloadImportTemplate = useCallback(
    async (entity: PeopleImportEntity, format: PeopleImportExportFormat): Promise<void> =>
      run(async () => {
        const file = await peopleImportExportApi.downloadImportTemplate(entity, format);
        triggerFileDownload(file);
      }, 'Template download failed'),
    [run]
  );

  const previewImport = useCallback(
    async (
      entity: PeopleImportEntity,
      file: File,
      mapping?: Record<string, string>
    ): Promise<PeopleImportPreview> =>
      run(() => peopleImportExportApi.previewImport(entity, file, mapping), 'Import preview failed'),
    [run]
  );

  const commitImport = useCallback(
    async (
      entity: PeopleImportEntity,
      file: File,
      mapping?: Record<string, string>
    ): Promise<PeopleImportCommitResult> =>
      run(() => peopleImportExportApi.commitImport(entity, file, mapping), 'Import commit failed'),
    [run]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    exportEntity,
    downloadImportTemplate,
    previewImport,
    commitImport,
    isLoading,
    error,
    clearError,
  };
};
