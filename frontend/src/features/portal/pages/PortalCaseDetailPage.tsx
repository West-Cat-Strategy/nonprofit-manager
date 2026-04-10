import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import portalApi from '../../../services/portalApi';
import { unwrapApiData } from '../../../services/apiEnvelope';
import { useToast } from '../../../contexts/useToast';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalListCard from '../../../components/portal/PortalListCard';
import { SectionCard } from '../../../components/ui';
import CaseProvenanceSummary from '../../../components/cases/CaseProvenanceSummary';
import { portalV2ApiClient } from '../../../features/portal/api/portalApiClient';
import type {
  PortalCaseDetail,
  PortalCaseDocument,
  PortalCaseTimelineEvent,
  PortalPointpersonContext,
} from '../../../features/portal/types/contracts';
import { usePersistentPortalCaseContext } from '../../../hooks/usePersistentPortalCaseContext';
import usePortalMessageThreads from '../client/usePortalMessageThreads';
import usePortalAppointments from '../client/usePortalAppointments';

const canPreviewInline = (mimeType?: string | null): boolean =>
  Boolean(mimeType && (mimeType === 'application/pdf' || mimeType.startsWith('image/')));

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PORTAL_TIMELINE_PAGE_LIMIT = 50;

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatFileSize = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type || 'unknown'}`;
  }

  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return 'Unsupported file extension.';
  }

  return null;
};

type UploadDraft = {
  document_name: string;
  document_type: string;
  description: string;
};

const initialUploadDraft: UploadDraft = {
  document_name: '',
  document_type: 'other',
  description: '',
};

export default function PortalCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caseDetail, setCaseDetail] = useState<PortalCaseDetail | null>(null);
  const [timeline, setTimeline] = useState<PortalCaseTimelineEvent[]>([]);
  const [timelineHasMore, setTimelineHasMore] = useState(false);
  const [timelineNextCursor, setTimelineNextCursor] = useState<string | null>(null);
  const [timelineLoadingMore, setTimelineLoadingMore] = useState(false);
  const [documents, setDocuments] = useState<PortalCaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pointpersonContext, setPointpersonContext] = useState<PortalPointpersonContext | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>(initialUploadDraft);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { setSelectedCaseId } = usePersistentPortalCaseContext();

  const messageThreadsState = usePortalMessageThreads({
    statusFilter: 'open',
    search: '',
    selectedCaseId: id ?? '',
    caseFilter: 'selected',
  });

  const appointmentsState = usePortalAppointments({
    statusFilter: 'all',
    search: '',
    selectedCaseId: id ?? '',
    caseFilter: 'selected',
  });

  const sortedTimeline = useMemo(
    () => [...timeline].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [timeline]
  );

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [documents]
  );

  const caseContext = useMemo(
    () => pointpersonContext?.cases.find((entry) => entry.case_id === id) ?? null,
    [id, pointpersonContext]
  );

  const loadCase = async () => {
    if (!id) {
      setError('Missing case id.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [detail, timelinePage, documentRows, contextResponse] = await Promise.all([
        portalV2ApiClient.getCase(id),
        portalV2ApiClient.getCaseTimeline(id, { limit: PORTAL_TIMELINE_PAGE_LIMIT }),
        portalV2ApiClient.listCaseDocuments(id),
        portalApi.get<PortalPointpersonContext>('/v2/portal/pointperson/context', {
          params: { case_id: id },
        }),
      ]);
      setCaseDetail(detail);
      setTimeline(timelinePage.items || []);
      setTimelineHasMore(Boolean(timelinePage.page?.has_more));
      setTimelineNextCursor(timelinePage.page?.next_cursor || null);
      setDocuments(documentRows || []);
      setPointpersonContext(unwrapApiData(contextResponse.data));
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

  const handleLoadMoreTimeline = async () => {
    if (!id || !timelineHasMore || !timelineNextCursor || timelineLoadingMore) {
      return;
    }

    try {
      setTimelineLoadingMore(true);
      const timelinePage = await portalV2ApiClient.getCaseTimeline(id, {
        limit: PORTAL_TIMELINE_PAGE_LIMIT,
        cursor: timelineNextCursor,
      });
      setTimeline((previous) => {
        const seen = new Set(previous.map((entry) => `${entry.type}-${entry.id}`));
        const merged = [...previous];
        for (const row of timelinePage.items || []) {
          const key = `${row.type}-${row.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(row);
          }
        }
        return merged;
      });
      setTimelineHasMore(Boolean(timelinePage.page?.has_more));
      setTimelineNextCursor(timelinePage.page?.next_cursor || null);
    } catch (err) {
      console.error('Failed to load more timeline entries', err);
    } finally {
      setTimelineLoadingMore(false);
    }
  };

  const handleUploadDraftChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setUploadDraft((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError('Select a file first.');
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', file);
      if (uploadDraft.document_type.trim()) {
        formData.append('document_type', uploadDraft.document_type.trim());
      }
      if (uploadDraft.document_name.trim()) {
        formData.append('document_name', uploadDraft.document_name.trim());
      }
      if (uploadDraft.description.trim()) {
        formData.append('description', uploadDraft.description.trim());
      }

      const created = await portalV2ApiClient.uploadCaseDocument(id, formData);
      setDocuments((current) =>
        [created, ...current.filter((entry) => entry.id !== created.id)].sort(
          (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        )
      );
      setUploadDraft(initialUploadDraft);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showSuccess('Document uploaded to your case workspace.');
    } catch (uploadFailure) {
      console.error('Failed to upload portal case document', uploadFailure);
      const message = 'Unable to upload this document right now.';
      setUploadError(message);
      showError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PortalPageShell
      title={caseDetail?.title || 'Case Workspace'}
      description={caseDetail?.case_number || 'Shared case workspace'}
      actions={
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to="/portal/cases" className="font-medium text-app-accent hover:underline">
            Back to My Cases
          </Link>
          <Link to="/portal/messages" className="font-medium text-app-accent hover:underline">
            Message Staff
          </Link>
          <Link to="/portal/appointments" className="font-medium text-app-accent hover:underline">
            Appointments
          </Link>
        </div>
      }
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && !caseDetail}
        loadingLabel="Loading case workspace..."
        emptyTitle="Case not found."
        emptyDescription="You may not have access to this case."
        onRetry={loadCase}
      />

      {!loading && !error && caseDetail && (
        <div className="space-y-5">
          <SectionCard
            title={caseDetail.title}
            subtitle={caseDetail.case_number}
            actions={
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/portal/messages"
                  className="rounded border border-app-input-border px-3 py-1 text-xs font-medium"
                >
                  Message about this case
                </Link>
                <Link
                  to="/portal/appointments"
                  className="rounded border border-app-input-border px-3 py-1 text-xs font-medium"
                >
                  Book or request appointment
                </Link>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
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
                {caseDetail.provenance && (
                  <CaseProvenanceSummary
                    provenance={caseDetail.provenance}
                    variant="portal"
                    density="inline"
                  />
                )}
                {caseContext?.pointperson_first_name && (
                  <span className="rounded bg-app-accent-soft px-2 py-0.5 text-app-accent-text">
                    Pointperson: {caseContext.pointperson_first_name} {caseContext.pointperson_last_name ?? ''}
                  </span>
                )}
              </div>

              {caseDetail.description && (
                <p className="whitespace-pre-wrap text-sm text-app-text">{caseDetail.description}</p>
              )}

              {caseDetail.provenance && (
                <CaseProvenanceSummary
                  provenance={caseDetail.provenance}
                  variant="portal"
                  density="panel"
                  className="mt-4"
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PortalListCard title="Opened" meta={formatDateTime(caseDetail.opened_date || caseDetail.intake_date)} />
                <PortalListCard title="Due" meta={formatDateTime(caseDetail.due_date)} />
                <PortalListCard title="Closed" meta={formatDateTime(caseDetail.closed_date)} />
                <PortalListCard
                  title="Staff Contact"
                  meta={
                    caseContext?.pointperson_first_name
                      ? `${caseContext.pointperson_first_name} ${caseContext.pointperson_last_name ?? ''}`.trim()
                      : 'Assigned staff will appear here'
                  }
                />
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Case Timeline" subtitle="Visible notes, outcomes, and shared documents for this case.">
              {sortedTimeline.length === 0 ? (
                <p className="text-sm text-app-text-muted">No visible timeline activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {sortedTimeline.map((event) => (
                    <PortalListCard
                      key={`${event.type}-${event.id}`}
                      title={event.title}
                      subtitle={event.type.toUpperCase()}
                      meta={formatDateTime(event.created_at)}
                      badges={
                        event.type === 'appointment' && event.metadata?.status ? (
                          <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text capitalize">
                            {event.metadata.status as string}
                          </span>
                        ) : undefined
                      }
                    >
                      {event.content && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">{event.content}</p>
                      )}
                      {event.type === 'appointment' && event.metadata?.start_time && (
                        <p className="mt-1 text-sm text-app-text-muted">
                          Scheduled: {formatDateTime(event.metadata.start_time as string)}
                        </p>
                      )}
                    </PortalListCard>
                  ))}
                  {timelineHasMore && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          void handleLoadMoreTimeline();
                        }}
                        disabled={timelineLoadingMore}
                        className="rounded border border-app-input-border px-3 py-2 text-xs disabled:opacity-60"
                      >
                        {timelineLoadingMore ? 'Loading...' : 'Load more activity'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            <div className="space-y-5">
              <SectionCard
                title="Case Conversations"
                subtitle="Open portal conversations for this case."
                actions={
                  <Link to="/portal/messages" className="text-sm font-medium text-app-accent hover:underline">
                    Open messages
                  </Link>
                }
              >
                <PortalPageState
                  loading={messageThreadsState.loading}
                  error={messageThreadsState.error}
                  empty={!messageThreadsState.loading && !messageThreadsState.error && messageThreadsState.threads.length === 0}
                  loadingLabel="Loading case conversations..."
                  emptyTitle="No case conversations yet."
                  emptyDescription="Start a message from this case workspace whenever you need staff support."
                  onRetry={() => {
                    void messageThreadsState.refresh();
                  }}
                  compact
                />
                {!messageThreadsState.loading && !messageThreadsState.error && messageThreadsState.threads.length > 0 && (
                  <div className="space-y-3">
                    {messageThreadsState.threads.slice(0, 3).map((thread) => (
                      <PortalListCard
                        key={thread.id}
                        title={thread.subject || 'Conversation'}
                        subtitle={thread.case_number || 'Case conversation'}
                        meta={formatDateTime(thread.last_message_at)}
                        badges={
                          <>
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted capitalize">
                              {thread.status}
                            </span>
                            {thread.unread_count > 0 && (
                              <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">
                                {thread.unread_count} unread
                              </span>
                            )}
                          </>
                        }
                      >
                        {thread.last_message_preview && (
                          <p className="line-clamp-2 text-sm text-app-text-muted">
                            {thread.last_message_preview}
                          </p>
                        )}
                      </PortalListCard>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Appointments For This Case"
                subtitle="Published slots and requests connected to this case."
                actions={
                  <Link to="/portal/appointments" className="text-sm font-medium text-app-accent hover:underline">
                    Open appointments
                  </Link>
                }
              >
                <PortalPageState
                  loading={appointmentsState.loading}
                  error={appointmentsState.error}
                  empty={!appointmentsState.loading && !appointmentsState.error && appointmentsState.appointments.length === 0}
                  loadingLabel="Loading appointments..."
                  emptyTitle="No appointments for this case yet."
                  emptyDescription="Book a slot or send a manual request when you need one."
                  onRetry={() => {
                    void appointmentsState.refresh();
                  }}
                  compact
                />
                {!appointmentsState.loading &&
                  !appointmentsState.error &&
                  appointmentsState.appointments.length > 0 && (
                    <div className="space-y-3">
                      {appointmentsState.appointments.slice(0, 4).map((appointment) => (
                        <PortalListCard
                          key={appointment.id}
                          title={appointment.title}
                          subtitle={appointment.request_type === 'slot_booking' ? 'Booked slot' : 'Appointment request'}
                          meta={formatDateTime(appointment.start_time)}
                          badges={
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted capitalize">
                              {appointment.status}
                            </span>
                          }
                        >
                          {appointment.description && (
                            <p className="text-sm text-app-text-muted">{appointment.description}</p>
                          )}
                        </PortalListCard>
                      ))}
                    </div>
                  )}
              </SectionCard>
            </div>
          </div>

          <SectionCard
            title="Case Documents"
            subtitle="Shared files stay here, and you can upload a new document for staff from this workspace."
          >
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <form onSubmit={handleUpload} className="space-y-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface-muted p-4">
                <div>
                  <label htmlFor="portal-case-document-file" className="text-sm font-medium text-app-text">
                    Upload a document
                  </label>
                  <input
                    id="portal-case-document-file"
                    ref={fileInputRef}
                    type="file"
                    className="mt-2 block w-full text-sm text-app-text"
                    onChange={() => setUploadError(null)}
                  />
                  <p className="mt-2 text-xs text-app-text-muted">
                    Accepted files: PDF, Office docs, CSV, text, and common image formats up to 10MB.
                  </p>
                </div>

                <div>
                  <label htmlFor="portal-case-document-name" className="text-sm font-medium text-app-text">
                    Title
                  </label>
                  <input
                    id="portal-case-document-name"
                    name="document_name"
                    value={uploadDraft.document_name}
                    onChange={handleUploadDraftChange}
                    placeholder="Optional display title"
                    className="mt-2 w-full rounded-md border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text"
                  />
                </div>

                <div>
                  <label htmlFor="portal-case-document-type" className="text-sm font-medium text-app-text">
                    Type
                  </label>
                  <select
                    id="portal-case-document-type"
                    name="document_type"
                    value={uploadDraft.document_type}
                    onChange={handleUploadDraftChange}
                    className="mt-2 w-full rounded-md border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text"
                  >
                    <option value="other">Other</option>
                    <option value="form">Form</option>
                    <option value="supporting_document">Supporting document</option>
                    <option value="assessment">Assessment</option>
                    <option value="report">Report</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="portal-case-document-description" className="text-sm font-medium text-app-text">
                    Notes for staff
                  </label>
                  <textarea
                    id="portal-case-document-description"
                    name="description"
                    value={uploadDraft.description}
                    onChange={handleUploadDraftChange}
                    rows={4}
                    placeholder="Optional context about this upload"
                    className="mt-2 w-full rounded-md border border-app-input-border bg-app-input-bg px-3 py-2 text-sm text-app-text"
                  />
                </div>

                {uploadError && <p className="text-sm text-app-accent-text">{uploadError}</p>}

                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </form>

              <div className="space-y-3">
                {sortedDocuments.length === 0 ? (
                  <p className="text-sm text-app-text-muted">No client-visible documents are available yet.</p>
                ) : (
                  sortedDocuments.map((doc) => (
                    <PortalListCard
                      key={doc.id}
                      title={doc.document_name || doc.original_filename}
                      subtitle={doc.document_type || 'document'}
                      meta={formatDateTime(doc.created_at)}
                      badges={
                        <>
                          <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                            {formatFileSize(doc.file_size)}
                          </span>
                          {doc.mime_type && (
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                              {doc.mime_type}
                            </span>
                          )}
                        </>
                      }
                      actions={
                        <div className="flex gap-2">
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
                      }
                    >
                      {doc.description && <p className="text-sm text-app-text">{doc.description}</p>}
                    </PortalListCard>
                  ))
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </PortalPageShell>
  );
}
