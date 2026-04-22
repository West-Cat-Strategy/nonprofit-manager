import { useCallback, useEffect, useMemo, useState } from 'react';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  CaseFormQuestion,
} from '../../../types/caseForms';
import CaseFormRenderer from '../../cases/components/CaseFormRenderer';
import { portalCaseFormsApiClient } from '../api/portalCaseFormsApiClient';

const COMPLETED_FORM_STATUSES = new Set<CaseFormAssignment['status']>([
  'reviewed',
  'closed',
  'expired',
  'cancelled',
]);

const RECEIPT_FORM_STATUSES = new Set<CaseFormAssignment['status']>(['submitted', 'reviewed']);
const formatAssignmentStatus = (status: CaseFormAssignment['status']): string => status.replace(/_/g, ' ');
const formatAssignmentCaseContext = (assignment: Pick<CaseFormAssignment, 'case_number' | 'case_title'>): string | null => {
  const parts = [assignment.case_number, assignment.case_title].filter(
    (value): value is string => Boolean(value)
  );
  return parts.length > 0 ? parts.join(' - ') : null;
};
const formatAssignmentTimeline = (assignment: Pick<CaseFormAssignment, 'submitted_at' | 'sent_at' | 'updated_at'>): string => {
  if (assignment.submitted_at) {
    return `Submitted ${new Date(assignment.submitted_at).toLocaleString()}`;
  }
  if (assignment.sent_at) {
    return `Sent ${new Date(assignment.sent_at).toLocaleString()}`;
  }
  return `Updated ${new Date(assignment.updated_at).toLocaleString()}`;
};

export default function PortalForms() {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<CaseFormAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseFormAssignmentDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});
  const [filter, setFilter] = useState<'active' | 'completed'>('active');

  const loadForms = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const assignments = await portalCaseFormsApiClient.listForms();
      setForms(assignments);
      setSelectedAssignmentId((current) =>
        current && assignments.some((item) => item.id === current) ? current : assignments[0]?.id || null
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load forms';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadDetail = useCallback(async (assignmentId: string): Promise<void> => {
    setError(null);
    try {
      const nextDetail = await portalCaseFormsApiClient.getForm(assignmentId);
      setError(null);
      setDetail(nextDetail);
      setDraftAnswers(nextDetail.assignment.current_draft_answers || {});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load form';
      setError(message);
      showError(message);
    }
  }, [showError]);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const isCompletedStatus = (status: string): boolean =>
    COMPLETED_FORM_STATUSES.has(status as CaseFormAssignment['status']);

  const visibleForms = useMemo(
    () => forms.filter((form) => (filter === 'active' ? !isCompletedStatus(form.status) : isCompletedStatus(form.status))),
    [filter, forms]
  );

  const visibleSelectionId = useMemo(() => {
    if (selectedAssignmentId && visibleForms.some((form) => form.id === selectedAssignmentId)) {
      return selectedAssignmentId;
    }

    return visibleForms[0]?.id ?? null;
  }, [selectedAssignmentId, visibleForms]);

  useEffect(() => {
    if (selectedAssignmentId !== visibleSelectionId) {
      setSelectedAssignmentId(visibleSelectionId);
    }
  }, [selectedAssignmentId, visibleSelectionId]);

  useEffect(() => {
    if (visibleSelectionId) {
      void loadDetail(visibleSelectionId);
      return;
    }

    setDetail(null);
    setDraftAnswers({});
  }, [loadDetail, visibleSelectionId]);

  const assets = useMemo(() => {
    if (!detail) return [];
    return [
      ...(detail.assignment.draft_assets || []),
      ...detail.submissions.flatMap((submission) => [...submission.asset_refs, ...submission.signature_refs]),
    ];
  }, [detail]);

  const isLocked =
    detail?.assignment.status &&
    COMPLETED_FORM_STATUSES.has(detail.assignment.status as CaseFormAssignment['status']);
  const isReceiptState =
    detail?.assignment.status &&
    RECEIPT_FORM_STATUSES.has(detail.assignment.status as CaseFormAssignment['status']);
  const isSubmittedAwaitingReview = detail?.assignment.status === 'submitted';

  const handleUploadAsset = async (
    question: CaseFormQuestion,
    file: File
  ): Promise<CaseFormAsset> => {
    if (!detail) {
      throw new Error('Form detail is unavailable');
    }

    const asset = await portalCaseFormsApiClient.uploadAsset(detail.assignment.id, {
      question_key: question.key,
      asset_kind: question.type === 'signature' ? 'signature' : 'upload',
      file,
    });

    setDetail((current) =>
      current
        ? {
            ...current,
            assignment: {
              ...current.assignment,
              draft_assets: [...(current.assignment.draft_assets || []), asset],
            },
          }
        : current
    );

    return asset;
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const assignment = await portalCaseFormsApiClient.saveDraft(detail.assignment.id, {
        answers: draftAnswers,
      });
      setDetail((current) =>
        current
          ? {
              ...current,
              assignment: {
                ...current.assignment,
                ...assignment,
              },
            }
          : current
      );
      showSuccess('Draft saved');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const nextDetail = await portalCaseFormsApiClient.submit(detail.assignment.id, {
        answers: draftAnswers,
        client_submission_id: crypto.randomUUID(),
      });
      setDetail(nextDetail);
      setForms((current) =>
        current.map((item) => (item.id === nextDetail.assignment.id ? { ...item, ...nextDetail.assignment } : item))
      );
      showSuccess('Form submitted');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalPageShell
      title="Forms"
      description="Complete assigned forms in your portal account or review your submission receipts."
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && forms.length === 0}
        loadingLabel="Loading forms..."
        emptyTitle="No forms available."
        emptyDescription="Forms appear here when staff assign them to your case."
        onRetry={() => {
          void loadForms();
        }}
      />
      {!loading && !error && forms.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilter('active')}
                aria-pressed={filter === 'active'}
                className={`rounded border px-3 py-2 text-xs font-semibold uppercase ${
                  filter === 'active' ? 'border-app-text bg-app-text text-white' : 'border-app-border'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                aria-pressed={filter === 'completed'}
                className={`rounded border px-3 py-2 text-xs font-semibold uppercase ${
                  filter === 'completed' ? 'border-app-text bg-app-text text-white' : 'border-app-border'
                }`}
              >
                Completed
              </button>
            </div>
            {visibleForms.length > 0 ? (
              <ul className="space-y-3">
                {visibleForms.map((form) => (
                  <li key={form.id}>
                    <PortalListCard
                      title={form.title}
                      subtitle={formatAssignmentCaseContext(form) || formatAssignmentStatus(form.status)}
                      meta={formatAssignmentTimeline(form)}
                      badges={
                        <>
                          <span className="rounded border border-app-border px-2 py-1 font-semibold uppercase">
                            {formatAssignmentStatus(form.status)}
                          </span>
                          {form.due_at && (
                            <span className="rounded border border-app-border px-2 py-1">
                              Due {new Date(form.due_at).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      }
                      actions={
                        <button
                          type="button"
                          onClick={() => setSelectedAssignmentId(form.id)}
                          className="rounded border border-app-input-border px-2 py-1 text-xs"
                        >
                          Open
                        </button>
                      }
                    >
                      {form.description && <p className="text-sm text-app-text-muted">{form.description}</p>}
                    </PortalListCard>
                  </li>
                ))}
              </ul>
            ) : (
              <PortalPageState
                empty
                compact
                emptyTitle={filter === 'active' ? 'No active forms.' : 'No completed forms.'}
                emptyDescription={
                  filter === 'active'
                    ? 'New forms stay active here until staff review is complete or the assignment closes.'
                    : 'Reviewed, closed, expired, or cancelled forms will appear here with their receipts.'
                }
              />
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-app-border bg-app-panel p-4">
            {detail ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-app-text">{detail.assignment.title}</h2>
                    {formatAssignmentCaseContext(detail.assignment) && (
                      <p className="mt-1 text-sm font-medium text-app-text-muted">
                        {formatAssignmentCaseContext(detail.assignment)}
                      </p>
                    )}
                    {detail.assignment.description && (
                      <p className="mt-1 text-sm text-app-text-muted">{detail.assignment.description}</p>
                    )}
                  </div>
                  <span className="rounded border border-app-border px-2 py-1 text-xs font-semibold uppercase">
                    {formatAssignmentStatus(detail.assignment.status)}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-app-text-muted">
                  {detail.assignment.due_at && (
                    <p>Due {new Date(detail.assignment.due_at).toLocaleString()}</p>
                  )}
                  <p>{formatAssignmentTimeline(detail.assignment)}</p>
                </div>

                {isReceiptState && (
                  <div className="rounded border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
                    <p className="font-semibold">
                      {isSubmittedAwaitingReview ? 'Submission received.' : 'Submission reviewed.'}
                    </p>
                    <p className="mt-1 text-app-text-muted">
                      {isSubmittedAwaitingReview
                        ? 'You can still update this form and resubmit it until staff finish reviewing the submission.'
                        : 'This form is now read-only. Review your responses below or download the response packet for your records.'}
                    </p>
                  </div>
                )}

                <CaseFormRenderer
                  schema={detail.assignment.schema}
                  answers={draftAnswers}
                  assets={assets}
                  variant="portal"
                  disabled={Boolean(isLocked) || saving}
                  onAnswerChange={(questionKey, value) =>
                    setDraftAnswers((current) => ({
                      ...current,
                      [questionKey]: value,
                    }))
                  }
                  onUploadAsset={handleUploadAsset}
                />

                {!isLocked && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSaveDraft()}
                      disabled={saving}
                      className="rounded border border-app-border px-4 py-2 text-sm font-semibold"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={saving}
                      className="rounded border border-app-text bg-app-text px-4 py-2 text-sm font-semibold text-white"
                    >
                      {isSubmittedAwaitingReview ? 'Resubmit Form' : 'Submit Form'}
                    </button>
                  </div>
                )}

                {detail.assignment.latest_submission?.response_packet_download_url && (
                  <a
                    href={portalCaseFormsApiClient.getResponsePacketDownloadUrl(detail.assignment.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded border border-app-border px-3 py-2 text-sm font-semibold"
                  >
                    Download Response Packet
                  </a>
                )}

                <div className="space-y-3 border-t border-app-border pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-app-text-muted">
                    Submission History
                  </h3>
                  {detail.submissions.length === 0 && (
                    <p className="text-sm text-app-text-muted">No submission receipt yet.</p>
                  )}
                  {detail.submissions.map((submission) => (
                    <div key={submission.id} className="rounded border border-app-border px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-app-text">
                            Submission #{submission.submission_number}
                          </p>
                          <p className="text-xs text-app-text-muted">
                            {new Date(submission.created_at).toLocaleString()} via {submission.submitted_by_actor_type}
                          </p>
                        </div>
                        {submission.response_packet_download_url && (
                          <a
                            href={submission.response_packet_download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold uppercase underline"
                          >
                            Packet
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <PortalPageState
                empty
                compact
                emptyTitle={filter === 'active' ? 'Select an active form.' : 'No completed form selected.'}
                emptyDescription={
                  visibleForms.length > 0
                    ? 'Choose a form on the left to review its details here.'
                    : filter === 'active'
                      ? 'There are no active forms to display right now.'
                      : 'There are no completed forms to display right now.'
                }
              />
            )}
          </div>
        </div>
      )}
    </PortalPageShell>
  );
}
