/**
 * Import/Export Modal Component
 */

import React, { useState } from 'react';
import { BrutalButton, BrutalCard } from '../neo-brutalist';
import { XMarkIcon, ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useImportExport } from '../../hooks';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'volunteers' | 'accounts' | 'contacts';
  onExport?: (format: 'csv') => void;
  onImport?: (data: Record<string, string>[]) => Promise<void>;
  sampleData?: Record<string, string>[];
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  entityType,
  onImport,
  sampleData = [],
}) => {
  const { exportToCSV, importFromCSV, isLoading, error: exportError } = useImportExport();
  const [tab, setTab] = useState<'import' | 'export'>('export');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (sampleData.length === 0) {
      setImportError('No data to export');
      return;
    }

    const columns = (Object.keys(sampleData[0]) ?? []) as (keyof Record<string, string>)[];
    exportToCSV(sampleData, columns, {
      filename: `${entityType}-export`,
      includeHeaders: true,
    });

    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const data = await importFromCSV(file);

      if (onImport) {
        await onImport(data);
        setImportSuccess(true);
        setTimeout(() => {
          setImportSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setImportError(message);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <BrutalCard className="w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-app-text">
          <h2 className="text-2xl font-bold text-app-text">
            Import/Export {entityType}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-app-surface-muted"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-app-text">
          <button
            onClick={() => setTab('export')}
            className={`flex-1 px-4 py-3 font-bold text-center ${tab === 'export'
              ? 'border-b-2 border-app-accent text-app-accent'
              : 'text-app-text-muted'
              }`}
          >
            Export
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 px-4 py-3 font-bold text-center ${tab === 'import'
              ? 'border-b-2 border-app-accent text-app-accent'
              : 'text-app-text-muted'
              }`}
          >
            Import
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {tab === 'export' ? (
            <>
              <div className="space-y-4">
                <h3 className="font-bold text-app-text">Export {entityType}</h3>
                <p className="text-sm text-app-text-muted">
                  Download all {entityType} data as a CSV file. You can edit the file
                  and import it back.
                </p>

                {sampleData.length === 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-600 p-3 rounded">
                    <p className="text-sm font-mono text-yellow-800">
                      No data available to export
                    </p>
                  </div>
                )}

                {importSuccess && (
                  <div className="bg-green-50 border-2 border-green-600 p-3 rounded">
                    <p className="text-sm font-mono text-green-800">
                      Export successful!
                    </p>
                  </div>
                )}

                {exportError && (
                  <div className="bg-red-50 border-2 border-red-600 p-3 rounded">
                    <p className="text-sm font-mono text-red-800">{exportError}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-app-text mb-2">Formats</h4>
                <p className="text-sm text-app-text-muted mb-3">
                  Choose a format to export your data:
                </p>
                <BrutalButton
                  onClick={handleExport}
                  disabled={sampleData.length === 0 || isLoading}
                  className="w-full bg-[var(--app-accent)] text-white"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 inline mr-2 stroke-[3px]" />
                  DOWNLOAD CSV
                </BrutalButton>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="font-bold text-app-text">
                  Import {entityType}
                </h3>
                <p className="text-sm text-app-text-muted">
                  Upload a CSV file to import or update {entityType}. The file
                  must have column headers matching the fields below.
                </p>

                {importError && (
                  <div className="bg-red-50 border-2 border-red-600 p-3 rounded">
                    <p className="text-sm font-mono text-red-800">
                      {importError}
                    </p>
                  </div>
                )}

                {importSuccess && (
                  <div className="bg-green-50 border-2 border-green-600 p-3 rounded">
                    <p className="text-sm font-mono text-green-800">
                      Import successful!
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-app-text mb-2">
                  Required Columns
                </h4>
                <div className="bg-app-surface-muted p-3 rounded border border-app-input-border mb-4">
                  <p className="text-xs font-mono text-app-text-muted">
                    Your CSV file must include headers in the first row.
                    Common fields:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs font-mono text-app-text-muted">
                    {entityType === 'volunteers' && (
                      <>
                        <li>• first_name, last_name, email</li>
                        <li>• phone, availability_status</li>
                        <li>• skills (comma-separated)</li>
                      </>
                    )}
                    {entityType === 'accounts' && (
                      <>
                        <li>• account_name, account_type, category</li>
                        <li>• email, phone, website</li>
                      </>
                    )}
                    {entityType === 'contacts' && (
                      <>
                        <li>• first_name, last_name, email</li>
                        <li>• phone, account_id (optional)</li>
                      </>
                    )}
                  </ul>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <BrutalButton
                  onClick={handleImportClick}
                  disabled={isLoading}
                  className="w-full"
                >
                  <ArrowUpTrayIcon className="w-4 h-4 inline mr-2" />
                  {isLoading ? 'Uploading...' : 'Choose CSV File'}
                </BrutalButton>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-app-text p-6 flex justify-end gap-2">
          <BrutalButton
            variant="secondary"
            onClick={onClose}
          >
            Close
          </BrutalButton>
        </div>
      </BrutalCard>
    </div>
  );
};
