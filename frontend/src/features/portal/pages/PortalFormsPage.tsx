import { useEffect, useMemo, useState } from 'react';
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

  const loadForms = async (): Promise<void> => {
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
  };

  const loadDetail = async (assignmentId: string): Promise<void> => {
    try {
      const nextDetail = await portalCaseFormsApiClient.getForm(assignmentId);
      setDetail(nextDetail);
      setDraftAnswers(nextDetail.assignment.current_draft_answers || {});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load form';
      setError(message);
      showError(message);
    }
  };

  useEffect(() => {
    void loadForms();
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      void loadDetail(selectedAssignmentId);
    } else {
      setDetail(null);
    }
  }, [selectedAssignmentId]);

  const isCompletedStatus = (status: string): boolean =>
    ['submitted', 'reviewed', 'closed', 'expired', 'cancelled'].includes(status);

  const visibleForms = useMemo(
    () => forms.filter((form) => (filter === 'active' ? !isCompletedStatus(form.status) : isCompletedStatus(form.status))),
    [filter, forms]
  );

  const assets = useMemo(() => {
    if (!detail) return [];
    return [
      ...(detail.assignment.draft_assets || []),
      ...detail.submissions.flatMap((submission) => [...submission.asset_refs, ...submission.signature_refs]),
    ];
  }, [detail]);

  const isLocked =
    detail?.assignment.status &&
    ['submitted', 'reviewed', 'closed', 'expired', 'cancelled'].includes(detail.assignment.status);

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
                className={`rounded border px-3 py-2 text-xs font-semibold uppercase ${
                  filter === 'active' ? 'border-app-text bg-app-text text-white' : 'border-app-border'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`rounded border px-3 py-2 text-xs font-semibold uppercase ${
                  filter === 'completed' ? 'border-app-text bg-app-text text-white' : 'border-app-border'
                }`}
              >
                Completed
              </button>
            </div>

            <ul className="space-y-3">
              {visibleForms.map((form) => (
                <li key={form.id}>
                  <PortalListCard
                    title={form.title}
                    subtitle={form.status.replace('_', ' ')}
                    meta={
                      form.submitted_at
                        ? `Submitted ${new Date(form.submitted_at).toLocaleString()}`
                        : form.sent_at
                          ? `Sent ${new Date(form.sent_at).toLocaleString()}`
                          : `Updated ${new Date(form.updated_at).toLocaleString()}`
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
          </div>

          <div className="space-y-4 rounded-xl border border-app-border bg-app-panel p-4">
            {detail ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-app-text">{detail.assignment.title}</h2>
                    {detail.assignment.description && (
                      <p className="mt-1 text-sm text-app-text-muted">{detail.assignment.description}</p>
                    )}
                  </div>
                  <span className="rounded border border-app-border px-2 py-1 text-xs font-semibold uppercase">
                    {detail.assignment.status.replace('_', ' ')}
                  </span>
                </div>

                {detail.assignment.due_at && (
                  <p className="text-sm text-app-text-muted">
                    Due {new Date(detail.assignment.due_at).toLocaleString()}
                  </p>
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
                      Submit Form
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
              <p className="text-sm text-app-text-muted">Choose a form to start or review.</p>
            )}
          </div>
        </div>
      )}
    </PortalPageShell>
  );
}
