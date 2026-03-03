import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalPageShell from '../components/portal/PortalPageShell';
import PortalPageState from '../components/portal/PortalPageState';
import PortalListCard from '../components/portal/PortalListCard';
import { portalV2ApiClient } from '../features/portal/api/portalApiClient';
import type {
  PortalCaseDetail,
  PortalCaseDocument,
  PortalCaseTimelineEvent,
} from '../features/portal/types/contracts';
import { usePersistentPortalCaseContext } from '../hooks/usePersistentPortalCaseContext';

const canPreviewInline = (mimeType?: string | null): boolean =>
  Boolean(mimeType && (mimeType === 'application/pdf' || mimeType.startsWith('image/')));

export default function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [caseDetail, setCaseDetail] = useState<PortalCaseDetail | null>(null);
  const [timeline, setTimeline] = useState<PortalCaseTimelineEvent[]>([]);
  const [documents, setDocuments] = useState<PortalCaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedCaseId } = usePersistentPortalCaseContext();

  const sortedTimeline = useMemo(
    () => [...timeline].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [timeline]
  );

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documents]
  );

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

  useEffect(() => {
    if (id) {
      setSelectedCaseId(id);
    }
  }, [id, setSelectedCaseId]);

  return (
    <PortalPageShell
      title={caseDetail?.title || 'Case Details'}
      description={caseDetail?.case_number}
      actions={
        <Link to="/portal/cases" className="text-sm text-app-accent hover:underline">
          Back to My Cases
        </Link>
      }
    >
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
        <div className="space-y-4">
          <PortalListCard
            title={caseDetail.title}
            subtitle={caseDetail.case_number}
            badges={
              <>
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
              </>
            }
          >
            {caseDetail.description && (
              <p className="whitespace-pre-wrap text-sm text-app-text">{caseDetail.description}</p>
            )}
          </PortalListCard>

          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <h3 className="text-base font-semibold text-app-text">Timeline</h3>
            {sortedTimeline.length === 0 ? (
              <p className="mt-2 text-sm text-app-text-muted">No visible timeline activity yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {sortedTimeline.map((event) => (
                  <PortalListCard
                    key={`${event.type}-${event.id}`}
                    title={event.title}
                    subtitle={event.type.toUpperCase()}
                    meta={new Date(event.created_at).toLocaleString()}
                  >
                    {event.content && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">{event.content}</p>
                    )}
                  </PortalListCard>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-app-border bg-app-surface p-4">
            <h3 className="text-base font-semibold text-app-text">Documents</h3>
            {sortedDocuments.length === 0 ? (
              <p className="mt-2 text-sm text-app-text-muted">No client-visible documents yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {sortedDocuments.map((doc) => (
                  <PortalListCard
                    key={doc.id}
                    title={doc.document_name || doc.original_filename}
                    subtitle={doc.document_type || 'document'}
                    meta={new Date(doc.created_at).toLocaleDateString()}
                    actions={
                      <>
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
                      </>
                    }
                  >
                    {doc.description && <p className="text-sm text-app-text">{doc.description}</p>}
                  </PortalListCard>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PortalPageShell>
  );
}
