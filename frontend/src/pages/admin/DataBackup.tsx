import { useMemo, useState } from 'react';
import api from '../../services/api';
import { formatApiErrorMessage } from '../../utils/apiError';

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
  const [error, setError] = useState<string | null>(null);

  const warningText = useMemo(() => {
    if (!includeSecrets) return null;
    return 'Includes password hashes, invitation tokens, and MFA secrets. Store this file securely.';
  }, [includeSecrets]);

  const downloadBackup = async () => {
    setDownloading(true);
    setError(null);
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
    } catch (e: any) {
      const message = formatApiErrorMessage(
        e,
        e?.message || 'Failed to download backup. Please try again.'
      );
      setError(String(message));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Data Backup</h1>
        <p className="mt-2 text-gray-600">
          Download a backup of your database as a gzipped JSON file.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Export Backup</h2>
          <p className="text-sm text-gray-500 mt-1">Admin-only. File is generated on-demand.</p>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
              checked={includeSecrets}
              onChange={(e) => setIncludeSecrets(e.target.checked)}
              disabled={downloading}
            />
            <span>
              <span className="font-medium text-gray-900">Include secrets (full backup)</span>
              <p className="text-sm text-gray-500">
                When off, secret fields are redacted for safer sharing/storage.
              </p>
            </span>
          </label>

          {warningText && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              {warningText}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              onClick={downloadBackup}
              disabled={downloading}
            >
              {downloading ? 'Preparing…' : 'Download Backup'}
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Tip: For point-in-time disaster recovery, database-level backups (e.g. <code>pg_dump</code>) are still
            recommended.
          </p>
        </div>
      </div>
    </div>
  );
}
