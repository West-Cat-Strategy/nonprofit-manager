import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownTrayIcon, ArrowPathIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import { useImportExport } from '../hooks/useImportExport';
import type { PeopleExportRequest, PeopleImportEntity, PeopleImportPreview } from '../services/peopleImportExportApi';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: PeopleImportEntity;
  exportRequest: Omit<PeopleExportRequest, 'format' | 'ids'>;
  selectedIds?: string[];
  onImportComplete?: () => void | Promise<void>;
}

const ENTITY_LABELS: Record<PeopleImportEntity, string> = {
  accounts: 'Accounts',
  contacts: 'Contacts',
  volunteers: 'Volunteers',
};

const countActiveFilters = (request: Omit<PeopleExportRequest, 'format' | 'ids'>): number =>
  Object.entries(request).filter(([, value]) => {
    if (value === undefined || value === null || value === '') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }).length;

const getPreviewSummaryText = (preview: PeopleImportPreview | null): string | null => {
  if (!preview) {
    return null;
  }

  if (preview.row_errors.length > 0) {
    return `${preview.row_errors.length} row(s) need fixes before commit.`;
  }

  return `${preview.to_create} create, ${preview.to_update} update, ${preview.total_rows} total row(s).`;
};

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  entityType,
  exportRequest,
  selectedIds = [],
  onImportComplete,
}) => {
  const {
    exportEntity,
    downloadImportTemplate,
    previewImport,
    commitImport,
    isLoading,
    error,
    clearError,
  } = useImportExport();

  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PeopleImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entityLabel = ENTITY_LABELS[entityType];
  const activeFilterCount = useMemo(() => countActiveFilters(exportRequest), [exportRequest]);
  const previewSummary = useMemo(() => getPreviewSummaryText(preview), [preview]);
  const resetImportState = () => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setMappingDirty(false);
  };

  useEffect(() => {
    if (!isOpen) {
      setTab('export');
      setFile(null);
      setPreview(null);
      setMapping({});
      setMappingDirty(false);
      setSuccessMessage(null);
      clearError();
    }
  }, [clearError, isOpen]);

  const runPreview = async (nextFile = file, nextMapping = mapping): Promise<PeopleImportPreview | null> => {
    if (!nextFile) {
      return null;
    }

    const nextPreview = await previewImport(entityType, nextFile, nextMapping);
    setFile(nextFile);
    setPreview(nextPreview);
    setMapping(nextPreview.mapping);
    setMappingDirty(false);
    setSuccessMessage(null);
    return nextPreview;
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    clearError();
    setSuccessMessage(null);

    try {
      await exportEntity(entityType, {
        ...exportRequest,
        format,
        ids: selectedIds.length > 0 ? selectedIds : undefined,
      });

      setSuccessMessage(
        selectedIds.length > 0
          ? `${entityLabel} export started for ${selectedIds.length} selected row(s).`
          : `${entityLabel} export started.`
      );
    } catch {
      // The hook already records the error state for the banner.
    }
  };

  const handleTemplateDownload = async (format: 'csv' | 'xlsx') => {
    clearError();
    setSuccessMessage(null);

    try {
      await downloadImportTemplate(entityType, format);
      setSuccessMessage(`${entityLabel} ${format.toUpperCase()} template downloaded.`);
    } catch {
      // The hook already records the error state for the banner.
    }
  };

  const handleImportClick = () => {
    clearError();
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }

    clearError();
    setSuccessMessage(null);
    resetImportState();

    try {
      await runPreview(nextFile, {});
    } catch {
      // The hook already records the error state for the banner.
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setSuccessMessage(null);
    setMapping((current) => {
      const nextMapping = { ...current };
      if (!targetField) {
        delete nextMapping[sourceColumn];
      } else {
        nextMapping[sourceColumn] = targetField;
      }
      return nextMapping;
    });
    setMappingDirty(true);
  };

  const handleCommit = async () => {
    if (!file) {
      return;
    }

    try {
      const latestPreview = mappingDirty ? await runPreview(file, mapping) : preview;
      if (!latestPreview || latestPreview.row_errors.length > 0) {
        return;
      }

      const result = await commitImport(entityType, file, latestPreview.mapping);
      resetImportState();
      setSuccessMessage(
        `Import complete: ${result.created} created, ${result.updated} updated, ${result.total_processed} processed.`
      );

      if (onImportComplete) {
        await onImportComplete();
      }
    } catch {
      // The hook already records the error state for the banner.
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop px-4 py-6">
      <BrutalCard className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-app-text p-6">
          <div>
            <h2 className="text-2xl font-bold text-app-text">Import / Export {entityLabel}</h2>
            <p className="mt-1 text-sm text-app-text-muted">
              Backend-driven exports plus preview-before-commit imports.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-app-surface-muted"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b-2 border-app-text">
          <button
            onClick={() => {
              clearError();
              setTab('export');
            }}
            className={`flex-1 px-4 py-3 text-center font-bold ${tab === 'export'
              ? 'border-b-2 border-app-accent text-app-accent'
              : 'text-app-text-muted'
              }`}
          >
            Export
          </button>
          <button
            onClick={() => {
              clearError();
              setTab('import');
            }}
            className={`flex-1 px-4 py-3 text-center font-bold ${tab === 'import'
              ? 'border-b-2 border-app-accent text-app-accent'
              : 'text-app-text-muted'
              }`}
          >
            Import
          </button>
        </div>

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded border-2 border-app-accent bg-app-accent-soft p-3 text-sm font-mono text-app-accent-text">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded border-2 border-app-accent bg-app-accent-soft p-3 text-sm font-mono text-app-accent-text">
              {successMessage}
            </div>
          )}

          {tab === 'export' ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">Scope</p>
                  <p className="mt-2 text-sm text-app-text">
                    {selectedIds.length > 0
                      ? `${selectedIds.length} selected row(s) will be exported.`
                      : 'All rows matching the current filters will be exported.'}
                  </p>
                </div>
                <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">Filters</p>
                  <p className="mt-2 text-sm text-app-text">
                    {activeFilterCount > 0
                      ? `${activeFilterCount} active filter(s) will be applied.`
                      : 'No additional filters are active.'}
                  </p>
                </div>
                <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-app-text-muted">Formats</p>
                  <p className="mt-2 text-sm text-app-text">CSV and XLSX downloads use the same backend file pipeline.</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <BrutalButton
                  onClick={() => {
                    void handleExport('csv');
                  }}
                  disabled={isLoading}
                  className="w-full bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
                >
                  <ArrowDownTrayIcon className="mr-2 inline h-5 w-5 stroke-[3px]" />
                  {isLoading ? 'Preparing…' : 'Download CSV'}
                </BrutalButton>
                <BrutalButton
                  onClick={() => {
                    void handleExport('xlsx');
                  }}
                  disabled={isLoading}
                  className="w-full"
                >
                  <ArrowDownTrayIcon className="mr-2 inline h-5 w-5" />
                  {isLoading ? 'Preparing…' : 'Download XLSX'}
                </BrutalButton>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
                <div className="space-y-4">
                  <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                    <h3 className="font-bold text-app-text">1. Upload File</h3>
                    <p className="mt-2 text-sm text-app-text-muted">
                      Upload a CSV or XLSX file. The server will preview the rows before anything is committed.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xslx"
                      onChange={(event) => {
                        void handleFileSelect(event);
                      }}
                      className="hidden"
                    />
                    <div className="mt-4 space-y-3">
                      <BrutalButton
                        onClick={handleImportClick}
                        disabled={isLoading}
                        className="w-full"
                      >
                        <ArrowUpTrayIcon className="mr-2 inline h-4 w-4" />
                        {file ? 'Choose Different File' : 'Choose File'}
                      </BrutalButton>
                      <div className="grid grid-cols-2 gap-2">
                        <BrutalButton
                          variant="secondary"
                          onClick={() => {
                            void handleTemplateDownload('csv');
                          }}
                          disabled={isLoading}
                          className="w-full"
                        >
                          <DocumentArrowDownIcon className="mr-2 inline h-4 w-4" />
                          CSV Template
                        </BrutalButton>
                        <BrutalButton
                          variant="secondary"
                          onClick={() => {
                            void handleTemplateDownload('xlsx');
                          }}
                          disabled={isLoading}
                          className="w-full"
                        >
                          <DocumentArrowDownIcon className="mr-2 inline h-4 w-4" />
                          XLSX Template
                        </BrutalButton>
                      </div>
                    </div>
                    {file && (
                      <p className="mt-3 text-xs font-mono text-app-text-muted">
                        Current file: {file.name}
                      </p>
                    )}
                  </div>

                  <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                    <h3 className="font-bold text-app-text">2. Review Preview</h3>
                    <p className="mt-2 text-sm text-app-text-muted">
                      {previewSummary || 'After upload, review detected columns, warnings, and row-level errors here.'}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded border border-app-input-border bg-app-bg p-3">
                        <p className="text-xs uppercase tracking-wide text-app-text-muted">Create</p>
                        <p className="mt-1 text-lg font-bold text-app-text">{preview?.to_create ?? 0}</p>
                      </div>
                      <div className="rounded border border-app-input-border bg-app-bg p-3">
                        <p className="text-xs uppercase tracking-wide text-app-text-muted">Update</p>
                        <p className="mt-1 text-lg font-bold text-app-text">{preview?.to_update ?? 0}</p>
                      </div>
                      <div className="rounded border border-app-input-border bg-app-bg p-3">
                        <p className="text-xs uppercase tracking-wide text-app-text-muted">Errors</p>
                        <p className="mt-1 text-lg font-bold text-app-text">{preview?.row_errors.length ?? 0}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <BrutalButton
                        variant="secondary"
                        onClick={() => {
                          void runPreview();
                        }}
                        disabled={!file || isLoading}
                        className="w-full"
                      >
                        <ArrowPathIcon className="mr-2 inline h-4 w-4" />
                        {isLoading ? 'Refreshing…' : 'Re-run Preview'}
                      </BrutalButton>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {preview && (
                    <>
                      <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                        <h3 className="font-bold text-app-text">Detected Columns</h3>
                        <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                          {preview.detected_columns.map((sourceColumn) => (
                            <div key={sourceColumn} className="rounded border border-app-input-border bg-app-bg p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-bold text-app-text">{sourceColumn}</p>
                                  <p className="text-xs text-app-text-muted">
                                    {(preview.mapping_candidates[sourceColumn] || [])
                                      .slice(0, 2)
                                      .map((candidate) => candidate.field)
                                      .join(', ') || 'No suggested mapping'}
                                  </p>
                                </div>
                                <select
                                  value={mapping[sourceColumn] || ''}
                                  onChange={(event) => handleMappingChange(sourceColumn, event.target.value)}
                                  className="min-w-[220px] rounded border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
                                >
                                  <option value="">Ignore column</option>
                                  {preview.field_options.map((option) => (
                                    <option key={option.field} value={option.field}>
                                      {option.field}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                        {mappingDirty && (
                          <p className="mt-3 text-xs font-mono text-app-text-muted">
                            Mapping changed. Re-run preview before commit.
                          </p>
                        )}
                      </div>

                      {(preview.warnings.length > 0 || preview.row_errors.length > 0) && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                            <h3 className="font-bold text-app-text">Warnings</h3>
                            {preview.warnings.length === 0 ? (
                              <p className="mt-2 text-sm text-app-text-muted">No warnings.</p>
                            ) : (
                              <ul className="mt-3 space-y-2 text-sm text-app-text-muted">
                                {preview.warnings.map((warning) => (
                                  <li key={warning}>{warning}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="rounded border border-app-input-border bg-app-surface-muted p-4">
                            <h3 className="font-bold text-app-text">Row Errors</h3>
                            {preview.row_errors.length === 0 ? (
                              <p className="mt-2 text-sm text-app-text-muted">No blocking errors.</p>
                            ) : (
                              <ul className="mt-3 max-h-48 space-y-3 overflow-y-auto text-sm text-app-text-muted">
                                {preview.row_errors.map((rowError) => (
                                  <li key={rowError.row_number} className="rounded border border-app-input-border bg-app-bg p-3">
                                    <p className="font-bold text-app-text">Row {rowError.row_number}</p>
                                    <p className="mt-1">{rowError.messages.join(' ')}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <BrutalButton
                          onClick={() => {
                            void handleCommit();
                          }}
                          disabled={!file || !preview || isLoading || preview.row_errors.length > 0}
                          className="bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
                        >
                          {isLoading ? 'Committing…' : 'Commit Import'}
                        </BrutalButton>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t-2 border-app-text p-6">
          <BrutalButton variant="secondary" onClick={onClose}>
            Close
          </BrutalButton>
        </div>
      </BrutalCard>
    </div>
  );
};
