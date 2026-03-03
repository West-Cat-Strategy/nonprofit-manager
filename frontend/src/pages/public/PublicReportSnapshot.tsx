import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { savedReportsApiClient } from '../../features/savedReports/api/savedReportsApiClient';
import type { PublicReportSnapshotMeta } from '../../types/savedReport';

const LIFECYCLE_LABELS: Record<string, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
  purged: 'Purged',
};

export default function PublicReportSnapshotPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'csv' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PublicReportSnapshotMeta | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Public report token is missing');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await savedReportsApiClient.fetchPublicReportMetadata(token);
        setMeta(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load public report';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const statusNote = useMemo(() => {
    if (!meta) return null;
    if (meta.lifecycle_state === 'active') return null;
    if (meta.lifecycle_state === 'expired') return 'This public link has expired.';
    if (meta.lifecycle_state === 'revoked') return 'This public link has been revoked.';
    return 'This public snapshot has been purged.';
  }, [meta]);

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    if (!token || !meta) return;
    setDownloading(format);
    setError(null);
    try {
      const blobPart = await savedReportsApiClient.downloadPublicReportSnapshot(token, format);
      const blob = new Blob(
        [blobPart],
        {
          type:
            format === 'xlsx'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv',
        }
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${meta.entity}_public_snapshot_${meta.created_at.slice(0, 10)}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to download snapshot';
      setError(message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mx-auto max-w-3xl border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[6px_6px_0px_0px_var(--shadow-color)]">
        <h1 className="text-2xl font-black text-[var(--app-text)]">Public Report Snapshot</h1>

        {loading && (
          <p className="mt-4 text-sm text-[var(--app-text-muted)]">Loading snapshot details...</p>
        )}

        {!loading && error && (
          <div className="mt-4 border-2 border-app-accent bg-app-accent-soft p-3 text-sm font-bold text-app-accent-text">
            {error}
          </div>
        )}

        {!loading && !error && meta && (
          <>
            <div className="mt-4 space-y-2 text-sm text-[var(--app-text)]">
              <p><strong>Name:</strong> {meta.report_name}</p>
              <p><strong>Entity:</strong> {meta.entity}</p>
              <p><strong>Rows:</strong> {meta.rows_count}</p>
              <p><strong>Status:</strong> {LIFECYCLE_LABELS[meta.lifecycle_state] || meta.lifecycle_state}</p>
              <p><strong>Created:</strong> {new Date(meta.created_at).toLocaleString()}</p>
              <p><strong>Expires:</strong> {meta.expires_at ? new Date(meta.expires_at).toLocaleString() : 'No expiry'}</p>
            </div>

            {statusNote && (
              <div className="mt-4 border-2 border-app-accent bg-app-accent-soft p-3 text-sm font-bold text-app-accent-text">
                {statusNote}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleDownload('csv')}
                disabled={
                  meta.lifecycle_state !== 'active' ||
                  !meta.available_formats.includes('csv') ||
                  downloading !== null
                }
                className="border-2 border-[var(--app-border)] bg-[var(--loop-cyan)] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
              >
                {downloading === 'csv' ? 'Downloading CSV...' : 'Download CSV'}
              </button>
              <button
                type="button"
                onClick={() => void handleDownload('xlsx')}
                disabled={
                  meta.lifecycle_state !== 'active' ||
                  !meta.available_formats.includes('xlsx') ||
                  downloading !== null
                }
                className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
              >
                {downloading === 'xlsx' ? 'Downloading XLSX...' : 'Download XLSX'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
