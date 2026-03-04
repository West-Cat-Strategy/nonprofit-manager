import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { savedReportsApiClient } from '../../features/savedReports/api/savedReportsApiClient';
import type { PublicReportSnapshotMeta } from '../../types/savedReport';
import { AuthHeroShell, PrimaryButton, SecondaryButton } from '../../components/ui';

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
    <AuthHeroShell
      badge="Public report"
      title="Public Report Snapshot"
      description="View metadata and export the shared report snapshot."
      highlights={[
        'Read-only access through an expiring token link.',
        'Lifecycle controls automatically disable expired snapshots.',
      ]}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">Snapshot details</p>
      {loading && (
        <p className="mt-4 text-sm text-app-text-muted" aria-live="polite">
          Loading snapshot details...
        </p>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-lg border border-app-border bg-app-accent-soft p-3 text-sm text-app-accent-text" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && meta && (
        <>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-app-text sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-app-text-heading">Name</dt>
              <dd>{meta.report_name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-app-text-heading">Entity</dt>
              <dd>{meta.entity}</dd>
            </div>
            <div>
              <dt className="font-semibold text-app-text-heading">Rows</dt>
              <dd>{meta.rows_count}</dd>
            </div>
            <div>
              <dt className="font-semibold text-app-text-heading">Status</dt>
              <dd>{LIFECYCLE_LABELS[meta.lifecycle_state] || meta.lifecycle_state}</dd>
            </div>
            <div>
              <dt className="font-semibold text-app-text-heading">Created</dt>
              <dd>{new Date(meta.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-semibold text-app-text-heading">Expires</dt>
              <dd>{meta.expires_at ? new Date(meta.expires_at).toLocaleString() : 'No expiry'}</dd>
            </div>
          </dl>

          {statusNote && (
            <div className="mt-4 rounded-lg border border-app-border bg-app-accent-soft p-3 text-sm text-app-accent-text">
              {statusNote}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <PrimaryButton
              type="button"
              onClick={() => void handleDownload('csv')}
              disabled={
                meta.lifecycle_state !== 'active' ||
                !meta.available_formats.includes('csv') ||
                downloading !== null
              }
            >
              {downloading === 'csv' ? 'Downloading CSV...' : 'Download CSV'}
            </PrimaryButton>
            <SecondaryButton
              type="button"
              onClick={() => void handleDownload('xlsx')}
              disabled={
                meta.lifecycle_state !== 'active' ||
                !meta.available_formats.includes('xlsx') ||
                downloading !== null
              }
            >
              {downloading === 'xlsx' ? 'Downloading XLSX...' : 'Download XLSX'}
            </SecondaryButton>
          </div>
        </>
      )}
    </AuthHeroShell>
  );
}
