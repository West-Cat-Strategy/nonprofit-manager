import { useMemo, useState } from 'react';
import api from '../../services/api';
import ErrorBanner from '../../components/ErrorBanner';
import { useApiError } from '../../hooks/useApiError';

function getFilenameFromContentDisposition(headerValue: string | undefined): string | null {
  if (!headerValue) return null;

  // Examples:
  // attachment; filename="file.json.gz"
  // attachment; filename*=UTF-8''file.json.gz
  const filenameStarMatch = headerValue.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    try {
      return decodeURIComponent(filenameStarMatch[1].trim());
    } catch {
      return filenameStarMatch[1].trim();
    }
  }

  const filenameMatch = headerValue.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (filenameMatch?.[1]) return filenameMatch[1].trim();
  return null;
}

export default function DataBackup() {
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { error, details, setFromError, clear } = useApiError();

  const warningText = useMemo(() => {
    if (!includeSecrets) return null;
    return 'Includes password hashes, invitation tokens, and MFA secrets. Store this file securely.';
  }, [includeSecrets]);

  const downloadBackup = async () => {
    setDownloading(true);
    clear();
    try {
      const response = await api.post(
        '/backup/export',
        { include_secrets: includeSecrets, compress: true },
        { responseType: 'blob' }
      );

      const disposition = (response.headers?.['content-disposition'] as string | undefined) ?? undefined;
      const filename =
        getFilenameFromContentDisposition(disposition) ??
        `nonprofit-manager-backup${includeSecrets ? '-full' : ''}.json.gz`;

      const blob = new Blob([response.data], {
        type: (response.headers?.['content-type'] as string | undefined) ?? 'application/gzip',
      });

      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e: unknown) {
      setFromError(e, (e as { message?: string })?.message || 'Failed to download backup. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-app-text">Data Backup</h1>
        <p className="mt-2 text-app-text-muted">
          Download a backup of your database as a gzipped JSON file.
        </p>
      </div>

      <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
          <h2 className="text-lg font-semibold text-app-text">Export Backup</h2>
          <p className="text-sm text-app-text-muted mt-1">Admin-only. File is generated on-demand.</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 text-app-accent border-app-input-border rounded"
              checked={includeSecrets}
              onChange={(e) => setIncludeSecrets(e.target.checked)}
              disabled={downloading}
            />
            <span>
              <span className="font-medium text-app-text">Include secrets (full backup)</span>
              <p className="text-sm text-app-text-muted">
                When off, secret fields are redacted for safer sharing/storage.
              </p>
            </span>
          </label>

          {warningText && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              {warningText}
            </div>
          )}

          <ErrorBanner message={error} correlationId={details?.correlationId} />

          <div className="pt-2">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-app-accent hover:bg-app-accent-hover disabled:opacity-50"
              onClick={downloadBackup}
              disabled={downloading}
            >
              {downloading ? 'Preparing…' : 'Download Backup'}
            </button>
          </div>

          <p className="text-sm text-app-text-muted">
            Tip: For point-in-time disaster recovery, database-level backups (e.g. <code>pg_dump</code>) are still
            recommended.
          </p>
        </div>
      </div>
    </div>
  );
}
