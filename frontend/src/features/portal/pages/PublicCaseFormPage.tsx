import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseFormAsset,
  CaseFormAssignmentDetail,
  CaseFormQuestion,
} from '../../../types/caseForms';
import CaseFormRenderer from '../../cases/components/CaseFormRenderer';
import { publicCaseFormsApiClient } from '../api/publicCaseFormsApiClient';

export default function PublicCaseFormPage() {
  const { token } = useParams<{ token: string }>();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseFormAssignmentDetail | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});

  const loadForm = async (): Promise<void> => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const nextDetail = await publicCaseFormsApiClient.getForm(token);
      setDetail(nextDetail);
      setDraftAnswers(nextDetail.assignment.current_draft_answers || {});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load secure form';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadForm();
  }, [token]);

  const assets = useMemo(() => {
    if (!detail) return [];
    return [
      ...(detail.assignment.draft_assets || []),
      ...detail.submissions.flatMap((submission) => [...submission.asset_refs, ...submission.signature_refs]),
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
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save draft');
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
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  const isLocked =
    detail?.assignment.status &&
    ['submitted', 'reviewed', 'closed', 'expired', 'cancelled'].includes(detail.assignment.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-2xl border border-app-border bg-white/95 p-6 shadow-sm">
        {loading && (
          <div className="flex items-center gap-3 text-sm font-semibold text-app-text">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-app-text border-t-transparent" />
            Loading secure form…
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
                Secure Case Form
              </p>
              <h1 className="text-3xl font-semibold text-app-text">{detail.assignment.title}</h1>
              {detail.assignment.description && (
                <p className="text-base text-app-text-muted">{detail.assignment.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-app-text-muted">
                <span className="rounded border border-app-border px-2 py-1 uppercase">
                  {detail.assignment.status.replace('_', ' ')}
                </span>
                {detail.assignment.due_at && (
                  <span>Due {new Date(detail.assignment.due_at).toLocaleString()}</span>
                )}
              </div>
            </div>

            <CaseFormRenderer
              schema={detail.assignment.schema}
              answers={draftAnswers}
              assets={assets}
              variant="public"
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

            {detail.assignment.latest_submission?.response_packet_download_url && token && (
              <a
                href={publicCaseFormsApiClient.getResponsePacketDownloadUrl(token)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded border border-app-border px-3 py-2 text-sm font-semibold"
              >
                Download Submission Packet
              </a>
            )}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-5 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
