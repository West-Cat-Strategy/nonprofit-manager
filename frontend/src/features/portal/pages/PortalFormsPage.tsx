import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseFormAsset,
  CaseFormAssignmentBucket,
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  CaseFormAssignmentSummary,
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
const formatAssignmentTimeline = (
  assignment: Pick<
    CaseFormAssignment,
    'revision_requested_at' | 'status' | 'submitted_at' | 'sent_at' | 'updated_at'
  >
): string => {
  if (assignment.status === 'revision_requested' && assignment.revision_requested_at) {
    return `Revision requested ${new Date(assignment.revision_requested_at).toLocaleString()}`;
  }
  if (assignment.submitted_at) {
    return `Submitted ${new Date(assignment.submitted_at).toLocaleString()}`;
  }
  if (assignment.sent_at) {
    return `Sent ${new Date(assignment.sent_at).toLocaleString()}`;
  }
  return `Updated ${new Date(assignment.updated_at).toLocaleString()}`;
};
const formActionClass =
  'inline-flex items-center gap-1.5 rounded border border-app-input-border px-2 py-1 text-xs transition-colors duration-150 hover:border-app-accent hover:bg-app-surface-muted';

export default function PortalForms() {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forms, setForms] = useState<CaseFormAssignmentSummary[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseFormAssignmentDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});
  const [filter, setFilter] = useState<CaseFormAssignmentBucket>('active');
  const formsRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const draftSnapshotRef = useRef('');

  const loadForms = useCallback(
    async (bucket: CaseFormAssignmentBucket): Promise<void> => {
      const requestId = ++formsRequestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const assignments = await portalCaseFormsApiClient.listForms(bucket);
        if (requestId !== formsRequestIdRef.current) {
          return;
        }

        setForms(assignments);
        setSelectedAssignmentId((current) =>
          current && assignments.some((item) => item.id === current) ? current : assignments[0]?.id || null
        );

        if (assignments.length === 0) {
          setDetail(null);
          setDraftAnswers({});
        }
      } catch (error) {
        if (requestId !== formsRequestIdRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to load forms';
        setError(message);
        showError(message);
      } finally {
        if (requestId === formsRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [showError]
  );

  const loadDetail = useCallback(
    async (assignmentId: string): Promise<void> => {
      const requestId = ++detailRequestIdRef.current;
      setError(null);
      try {
        const nextDetail = await portalCaseFormsApiClient.getForm(assignmentId);
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        setError(null);
        setDetail(nextDetail);
        setDraftAnswers(nextDetail.assignment.current_draft_answers || {});
        draftSnapshotRef.current = JSON.stringify(nextDetail.assignment.current_draft_answers || {});
      } catch (error) {
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to load form';
        setError(message);
        showError(message);
      }
    },
    [showError]
  );

  useEffect(() => {
    void loadForms(filter);
  }, [loadForms, filter]);

  useEffect(() => {
    if (selectedAssignmentId) {
      void loadDetail(selectedAssignmentId);
      return;
    }

    detailRequestIdRef.current += 1;
    setDetail(null);
    setDraftAnswers({});
    draftSnapshotRef.current = '';
  }, [loadDetail, selectedAssignmentId]);

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
  const isRevisionRequested = detail?.assignment.status === 'revision_requested';

  useEffect(() => {
    if (!detail || isLocked || saving) return;
    const snapshot = JSON.stringify(draftAnswers);
    if (snapshot === draftSnapshotRef.current) return;

    const timeout = window.setTimeout(() => {
      void portalCaseFormsApiClient
        .saveDraft(detail.assignment.id, { answers: draftAnswers })
        .then((assignment) => {
          draftSnapshotRef.current = snapshot;
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
        })
        .catch(() => {
          // Manual Save Draft remains available when background autosave cannot complete.
        });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [detail, draftAnswers, isLocked, saving]);

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
      draftSnapshotRef.current = JSON.stringify(draftAnswers);
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
      draftSnapshotRef.current = JSON.stringify(nextDetail.assignment.current_draft_answers || draftAnswers);
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
        empty={!loading && !error && filter === 'active' && forms.length === 0}
        loadingLabel="Loading forms..."
        emptyTitle="No forms available."
        emptyDescription="Forms appear here when staff assign them to your case."
        emptyIcon={<DocumentTextIcon className="h-5 w-5" aria-hidden="true" />}
        onRetry={() => {
          void loadForms(filter);
        }}
      />
      {!loading && !error && (forms.length > 0 || filter === 'completed') && (
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
            {forms.length > 0 ? (
              <ul className="space-y-3">
                {forms.map((form) => (
                  <li key={form.id}>
                    <PortalListCard
                      icon={<ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden="true" />}
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
                          className={formActionClass}
                        >
                          <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
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
                        : 'This form is now read-only. Review your responses below or download your submitted answers for your records.'}
                    </p>
                  </div>
                )}

                {isRevisionRequested && (
                  <div className="rounded border border-app-border bg-app-accent-soft px-4 py-3 text-sm text-app-accent-text">
                    <p className="font-semibold">Changes requested.</p>
                    <p className="mt-1 text-app-text-muted">
                      {detail.assignment.revision_notes ||
                        'Staff requested updates to this form. Review your responses and resubmit when ready.'}
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
                      className="inline-flex items-center gap-1.5 rounded border border-app-border px-4 py-2 text-sm font-semibold transition-colors duration-150 hover:border-app-accent hover:bg-app-surface-muted"
                    >
                      <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded border border-app-text bg-app-text px-4 py-2 text-sm font-semibold text-white transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <DocumentCheckIcon className="h-4 w-4" aria-hidden="true" />
                      {isSubmittedAwaitingReview || isRevisionRequested ? 'Resubmit Form' : 'Submit Form'}
                    </button>
                  </div>
                )}

                {detail.assignment.latest_submission?.response_packet_download_url && (
                  <a
                    href={portalCaseFormsApiClient.getResponsePacketDownloadUrl(detail.assignment.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded border border-app-border px-3 py-2 text-sm font-semibold transition-colors duration-150 hover:border-app-accent hover:bg-app-surface-muted"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                    Download submitted answers
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
                            className="inline-flex items-center gap-1 text-xs font-semibold uppercase underline"
                          >
                            <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            Receipt
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
                  forms.length > 0
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
