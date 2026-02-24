import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalPageState from '../components/portal/PortalPageState';
import { portalV2ApiClient } from '../features/portal/api/portalApiClient';
import type {
  PortalCaseDetail,
  PortalCaseDocument,
  PortalCaseTimelineEvent,
} from '../features/portal/types/contracts';

const canPreviewInline = (mimeType?: string | null): boolean =>
  Boolean(mimeType && (mimeType === 'application/pdf' || mimeType.startsWith('image/')));

export default function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseDetail, setCaseDetail] = useState<PortalCaseDetail | null>(null);
  const [timeline, setTimeline] = useState<PortalCaseTimelineEvent[]>([]);
  const [documents, setDocuments] = useState<PortalCaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCase = async () => {
    if (!id) {
      setError('Missing case id.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [detail, timelineRows, documentRows] = await Promise.all([
        portalV2ApiClient.getCase(id),
        portalV2ApiClient.getCaseTimeline(id),
        portalV2ApiClient.listCaseDocuments(id),
      ]);
      setCaseDetail(detail);
      setTimeline(timelineRows || []);
      setDocuments(documentRows || []);
    } catch (err) {
      console.error('Failed to load portal case detail', err);
      setError('Unable to load this case.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div>
      <Link to="/portal/cases" className="text-sm text-app-accent hover:underline">
        ← Back to My Cases
      </Link>

      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && !caseDetail}
        loadingLabel="Loading case details..."
        emptyTitle="Case not found."
        emptyDescription="You may not have access to this case."
        onRetry={loadCase}
      />

      {!loading && !error && caseDetail && (
        <div className="mt-4 space-y-5">
          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
              {caseDetail.case_number}
            </p>
            <h2 className="text-lg font-semibold text-app-text">{caseDetail.title}</h2>
            {caseDetail.description && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-app-text">{caseDetail.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {caseDetail.status_name && (
                <span className="rounded bg-app-surface-muted px-2 py-0.5 text-app-text-muted">
                  {caseDetail.status_name}
                </span>
              )}
              {caseDetail.case_type_name && (
                <span className="rounded bg-app-surface-muted px-2 py-0.5 text-app-text-muted">
                  {caseDetail.case_type_name}
                </span>
              )}
              {caseDetail.priority && (
                <span className="rounded bg-app-surface-muted px-2 py-0.5 text-app-text-muted capitalize">
                  {caseDetail.priority}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <h3 className="text-base font-semibold text-app-text">Timeline</h3>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-app-text-muted">No visible timeline activity yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {timeline.map((event) => (
                  <div key={`${event.type}-${event.id}`} className="rounded border border-app-border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-app-surface-muted px-2 py-0.5 uppercase text-app-text-muted">
                        {event.type}
                      </span>
                      <span className="text-app-text-muted">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-app-text">{event.title}</p>
                    {event.content && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">{event.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <h3 className="text-base font-semibold text-app-text">Documents</h3>
            {documents.length === 0 ? (
              <p className="mt-2 text-sm text-app-text-muted">No client-visible documents yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-start justify-between rounded border border-app-border p-3">
                    <div>
                      <p className="text-sm font-semibold text-app-text">
                        {doc.document_name || doc.original_filename}
                      </p>
                      <p className="text-xs text-app-text-muted">
                        {doc.document_type || 'document'} ·{' '}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      {doc.description && <p className="mt-1 text-sm text-app-text">{doc.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {canPreviewInline(doc.mime_type) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!id) return;
                            const url = portalV2ApiClient.getCaseDocumentDownloadUrl(id, doc.id, 'inline');
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="rounded border border-app-input-border px-2 py-1 text-xs"
                        >
                          Preview
                        </button>
                      )}
                      <a
                        href={id ? portalV2ApiClient.getCaseDocumentDownloadUrl(id, doc.id, 'attachment') : '#'}
                        className="rounded border border-app-input-border px-2 py-1 text-xs"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
