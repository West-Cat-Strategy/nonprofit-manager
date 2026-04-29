import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  PublicPageShell,
  SecondaryButton,
} from '../../../components/ui';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseFormAsset,
  CaseFormAssignmentDetail,
  CaseFormQuestion,
} from '../../../types/caseForms';
import CaseFormRenderer from '../../cases/components/CaseFormRenderer';
import { publicCaseFormsApiClient } from '../api/publicCaseFormsApiClient';
import { formatPortalDateTime } from '../utils/dateDisplay';

const SUBMISSION_RECEIPT_STATUSES = new Set(['submitted', 'reviewed']);
const LOCKED_RECEIPT_STATUSES = new Set(['reviewed']);
const INACTIVE_STATUSES = new Set(['expired', 'cancelled', 'closed']);

const getUnavailableCopy = (status: string | null | undefined) => {
  switch (status) {
    case 'expired':
      return {
        title: 'This secure form link has expired.',
        description:
          'Please contact the organization that sent this form if you still need to submit it.',
      };
    case 'cancelled':
      return {
        title: 'This secure form is no longer accepting responses.',
        description:
          'The organization cancelled this request. Contact them if you still need to respond.',
      };
    case 'closed':
      return {
        title: 'This secure form is closed.',
        description:
          'Responses are no longer being accepted. Contact the organization if you need help.',
      };
    default:
      return {
        title: 'This secure form link is unavailable.',
        description:
          'If you expected this form to be active, contact the organization that sent it for a fresh link.',
      };
  }
};

export default function PublicCaseFormPage() {
  const { token } = useParams<{ token: string }>();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseFormAssignmentDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});

  const loadForm = useCallback(async (): Promise<void> => {
    if (!token) {
      setError('This secure form link is missing its access token.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextDetail = await publicCaseFormsApiClient.getForm(token);
      setDetail(nextDetail);
      setDraftAnswers(nextDetail.assignment.current_draft_answers || {});
    } catch (loadError) {
      setDetail(null);
      const message = loadError instanceof Error ? loadError.message : 'Failed to load secure form';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError, token]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  const assets = useMemo(() => {
    if (!detail) return [];
    return [
      ...(detail.assignment.draft_assets || []),
      ...detail.submissions.flatMap((submission) => [
        ...submission.asset_refs,
        ...submission.signature_refs,
      ]),
    ];
  }, [detail]);

  const handleUploadAsset = async (
    question: CaseFormQuestion,
    file: File
  ): Promise<CaseFormAsset> => {
    if (!token) {
      throw new Error('Secure form token is missing');
    }

    const asset = await publicCaseFormsApiClient.uploadAsset(token, {
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
    if (!token) return;
    setSaving(true);
    try {
      const assignment = await publicCaseFormsApiClient.saveDraft(token, {
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
    } catch (saveError) {
      showError(saveError instanceof Error ? saveError.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!token) return;
    setSaving(true);
    try {
      const nextDetail = await publicCaseFormsApiClient.submit(token, {
        answers: draftAnswers,
        client_submission_id: crypto.randomUUID(),
      });
      setDetail(nextDetail);
      showSuccess('Form submitted');
    } catch (submitError) {
      showError(submitError instanceof Error ? submitError.message : 'Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  const assignment = detail?.assignment ?? null;
  const assignmentStatus = assignment?.status ?? null;
  const isReceiptState = assignmentStatus ? SUBMISSION_RECEIPT_STATUSES.has(assignmentStatus) : false;
  const isLockedReceiptState = assignmentStatus ? LOCKED_RECEIPT_STATUSES.has(assignmentStatus) : false;
  const isUnavailableState = assignmentStatus ? INACTIVE_STATUSES.has(assignmentStatus) : false;
  const isSubmittedAwaitingReview = assignmentStatus === 'submitted';
  const isRevisionRequested = assignmentStatus === 'revision_requested';
  const statusLabel = assignmentStatus ? assignmentStatus.replaceAll('_', ' ') : null;
  const submittedAtLabel = assignment?.submitted_at
    ? formatPortalDateTime(assignment.submitted_at)
    : assignment?.latest_submission?.created_at
      ? formatPortalDateTime(assignment.latest_submission.created_at)
      : null;
  const dueAtLabel = assignment?.due_at ? formatPortalDateTime(assignment.due_at) : null;
  const packetDownloadUrl =
    assignment?.latest_submission?.response_packet_download_url && token
      ? publicCaseFormsApiClient.getResponsePacketDownloadUrl(token)
      : null;
  const unavailableCopy =
    isUnavailableState || (!loading && error)
      ? getUnavailableCopy(assignmentStatus)
      : null;

  return (
    <PublicPageShell
      badge="Secure case form"
      title={assignment?.title || 'Secure Case Form'}
      description={
        assignment?.description ||
        'Complete the secure form shared with you and submit it directly to the organization.'
      }
      actions={
        packetDownloadUrl ? (
          <a
            href={packetDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text shadow-sm transition hover:bg-app-surface-muted"
          >
            Download Submission Packet
          </a>
        ) : null
      }
    >
      <section className="rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-app-surface-elevated/92 p-6 shadow-[var(--ui-elev-2)]">
        {loading ? (
          <LoadingState label="Loading secure form..." />
        ) : null}

        {!loading && error ? (
          <div className="space-y-4">
            <ErrorState
              message={error}
              onRetry={() => {
                void loadForm();
              }}
              retryLabel="Retry loading form"
            />
            <div className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-4 text-sm text-app-text-muted">
              <p className="font-medium text-app-text-heading">
                {unavailableCopy?.title || 'Need help with this secure form?'}
              </p>
              <p className="mt-2">
                {unavailableCopy?.description ||
                  'If this link should still work, contact the organization that sent it and ask for a fresh secure form link.'}
              </p>
            </div>
          </div>
        ) : null}

        {!loading && !error && assignment ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-app-text-muted">
                {statusLabel ? (
                  <span className="rounded border border-app-border px-2 py-1 text-xs font-semibold uppercase tracking-wide text-app-text-heading">
                    {statusLabel}
                  </span>
                ) : null}
                {dueAtLabel ? <span>Due {dueAtLabel}</span> : null}
                {submittedAtLabel ? <span>Submitted {submittedAtLabel}</span> : null}
              </div>

              {isReceiptState ? (
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-app-accent-soft px-4 py-4 text-sm text-app-accent-text">
                  <p className="font-medium">
                    {isSubmittedAwaitingReview ? 'Submission received.' : 'Submission reviewed.'}
                  </p>
                  <p className="mt-1 text-app-text-muted">
                    {isSubmittedAwaitingReview
                      ? 'You can still update this secure form and resubmit it until staff finish reviewing the submission.'
                      : 'This secure form is now read-only. Review your responses below or download the submission packet for your records.'}
                  </p>
                </div>
              ) : null}

              {isRevisionRequested ? (
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-app-accent-soft px-4 py-4 text-sm text-app-accent-text">
                  <p className="font-medium">Changes requested.</p>
                  <p className="mt-1 text-app-text-muted">
                    {assignment.revision_notes ||
                      'Staff requested updates to this secure form. Review your responses and resubmit when ready.'}
                  </p>
                </div>
              ) : null}

              {isUnavailableState ? (
                <div className="rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface px-4 py-4 text-sm text-app-text-muted">
                  <p className="font-medium text-app-text-heading">{unavailableCopy?.title}</p>
                  <p className="mt-2">{unavailableCopy?.description}</p>
                </div>
              ) : null}
            </div>

            <CaseFormRenderer
              schema={assignment.schema}
              answers={draftAnswers}
              assets={assets}
              variant="public"
              disabled={Boolean(isLockedReceiptState || isUnavailableState) || saving}
              onAnswerChange={(questionKey, value) =>
                setDraftAnswers((current) => ({
                  ...current,
                  [questionKey]: value,
                }))
              }
              onUploadAsset={handleUploadAsset}
            />

            {!isLockedReceiptState && !isUnavailableState ? (
              <div className="flex flex-wrap gap-3">
                <SecondaryButton
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </SecondaryButton>
                <PrimaryButton
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                >
                  {saving
                    ? 'Submitting...'
                    : isSubmittedAwaitingReview || isRevisionRequested
                      ? 'Resubmit Form'
                      : 'Submit Form'}
                </PrimaryButton>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && !assignment ? (
          <EmptyState
            title="This secure form is not available."
            description="If you expected this form to be active, contact the organization that sent it for a fresh link."
          />
        ) : null}
      </section>

      <section className="rounded-[var(--ui-radius-lg)] border border-app-border-muted bg-app-surface p-5 text-sm text-app-text-muted shadow-sm">
        <h2 className="text-base font-semibold text-app-text-heading">Need support?</h2>
        <p className="mt-2">
          If the secure form does not load, appears expired, or you need a different link, contact
          the organization or staff member who sent you this form.
        </p>
      </section>
    </PublicPageShell>
  );
}
