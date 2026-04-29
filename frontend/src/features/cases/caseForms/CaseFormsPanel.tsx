import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrutalCard } from '../../../components/neo-brutalist';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  CaseFormAsset,
  CaseFormDeliveryTarget,
  CaseFormDefault,
  CaseFormQuestion,
  CaseFormReviewDecision,
  CaseFormSchema,
} from '../../../types/caseForms';
import { staffCaseFormsApiClient } from '../api/caseFormsApiClient';
import { CaseFormsAssignmentActionsCard } from './CaseFormsAssignmentActionsCard';
import { CaseFormsBuilderCard } from './CaseFormsBuilderCard';
import { CaseFormsPreviewHistory } from './CaseFormsPreviewHistory';
import { CaseFormsSidebar } from './CaseFormsSidebar';
import {
  collectAssets,
  createBlankSchema,
  createId,
  resolveDeliveryTarget,
  successMessageForTarget,
  usesEmailDelivery,
} from './caseFormsPanelUtils';

interface CaseFormsPanelProps {
  caseId: string;
  clientEmail?: string | null;
  clientViewable: boolean;
  onChanged?: () => void;
}

export default function CaseFormsPanel({
  caseId,
  clientEmail,
  clientViewable,
  onChanged,
}: CaseFormsPanelProps) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [assignments, setAssignments] = useState<CaseFormAssignment[]>([]);
  const [recommendedDefaults, setRecommendedDefaults] = useState<CaseFormDefault[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseFormAssignmentDetail | null>(null);
  const [editorTitle, setEditorTitle] = useState('Client Intake Form');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorDueAt, setEditorDueAt] = useState('');
  const [editorRecipientEmail, setEditorRecipientEmail] = useState(clientEmail || '');
  const [editorSchema, setEditorSchema] = useState<CaseFormSchema>(createBlankSchema('Client Intake Form'));
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [sendExpiryDays, setSendExpiryDays] = useState('7');
  const [deliveryTarget, setDeliveryTarget] = useState<CaseFormDeliveryTarget>(
    resolveDeliveryTarget(null, clientEmail || null)
  );
  const [logicDrafts, setLogicDrafts] = useState<Record<string, string>>({});

  const loadAssignments = useCallback(async (preserveSelection = true): Promise<void> => {
    setLoading(true);
    try {
      const [defaults, assignmentList] = await Promise.all([
        staffCaseFormsApiClient.listRecommendedDefaults(caseId),
        staffCaseFormsApiClient.listAssignments(caseId),
      ]);
      setRecommendedDefaults(defaults);
      setAssignments(assignmentList);

      const nextSelectedId =
        preserveSelection && selectedAssignmentId && assignmentList.some((item) => item.id === selectedAssignmentId)
          ? selectedAssignmentId
          : assignmentList[0]?.id || null;
      setSelectedAssignmentId(nextSelectedId);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load case forms');
    } finally {
      setLoading(false);
    }
  }, [caseId, selectedAssignmentId, showError]);

  const loadDetail = useCallback(async (assignmentId: string): Promise<void> => {
    try {
      const nextDetail = await staffCaseFormsApiClient.getAssignment(caseId, assignmentId);
      setDetail(nextDetail);
      setEditorTitle(nextDetail.assignment.title);
      setEditorDescription(nextDetail.assignment.description || '');
      setEditorDueAt(
        typeof nextDetail.assignment.due_at === 'string'
          ? nextDetail.assignment.due_at.slice(0, 16)
          : ''
      );
      setEditorRecipientEmail(nextDetail.assignment.recipient_email || clientEmail || '');
      setEditorSchema(nextDetail.assignment.schema);
      setDraftAnswers(nextDetail.assignment.current_draft_answers || {});
      setDeliveryTarget(
        resolveDeliveryTarget(
          nextDetail.assignment.delivery_target,
          nextDetail.assignment.recipient_email || clientEmail || null
        )
      );
      setLogicDrafts({});
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load form detail');
    }
  }, [caseId, clientEmail, showError]);

  useEffect(() => {
    void loadAssignments(false);
  }, [loadAssignments]);

  useEffect(() => {
    if (selectedAssignmentId) {
      void loadDetail(selectedAssignmentId);
    } else {
      setDetail(null);
    }
  }, [loadDetail, selectedAssignmentId]);

  const assignment = detail?.assignment ?? null;
  const assignmentAccessLinkUrl = assignment?.access_link_url ?? null;
  const assignmentHasEmailDeliveryTarget = assignment?.delivery_target
    ? usesEmailDelivery(assignment.delivery_target)
    : false;
  const assets = useMemo(() => collectAssets(detail), [detail]);
  const emailDeliveryEnabled = usesEmailDelivery(deliveryTarget);
  const canShowAccessLink = Boolean(assignmentAccessLinkUrl) && assignmentHasEmailDeliveryTarget;

  const syncAssignmentList = (updatedAssignment: CaseFormAssignment): void => {
    setAssignments((current) => {
      const existing = current.find((item) => item.id === updatedAssignment.id);
      if (!existing) {
        return [updatedAssignment, ...current];
      }
      return current.map((item) => (item.id === updatedAssignment.id ? { ...item, ...updatedAssignment } : item));
    });
  };

  const handleCreateBlankForm = async (): Promise<void> => {
    setCreating(true);
    try {
      const title = `Client Intake Form ${assignments.length + 1}`;
      const created = await staffCaseFormsApiClient.createAssignment(caseId, {
        title,
        description: 'Collect case intake details from the client.',
        schema: createBlankSchema(title),
        recipient_email: clientEmail || undefined,
      });
      showSuccess('Blank form created');
      syncAssignmentList(created);
      setSelectedAssignmentId(created.id);
      onChanged?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create blank form');
    } finally {
      setCreating(false);
    }
  };

  const handleInstantiateDefault = async (formDefault: CaseFormDefault): Promise<void> => {
    try {
      const created = await staffCaseFormsApiClient.instantiateDefault(caseId, formDefault.id);
      showSuccess(`Added "${formDefault.title}" to this case`);
      syncAssignmentList(created);
      setSelectedAssignmentId(created.id);
      onChanged?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to add recommended form');
    }
  };

  const handleSaveStructure = async (): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await staffCaseFormsApiClient.updateAssignment(caseId, detail.assignment.id, {
        title: editorTitle,
        description: editorDescription || null,
        due_at: editorDueAt ? new Date(editorDueAt).toISOString() : null,
        recipient_email: editorRecipientEmail || null,
        schema: {
          ...editorSchema,
          title: editorTitle,
          description: editorDescription,
        },
      });
      syncAssignmentList(updated);
      await loadDetail(updated.id);
      showSuccess('Form structure saved');
      onChanged?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save form structure');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async (): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await staffCaseFormsApiClient.saveDraft(caseId, detail.assignment.id, {
        answers: draftAnswers,
      });
      syncAssignmentList(updated);
      setDetail((current) =>
        current
          ? {
              ...current,
              assignment: {
                ...current.assignment,
                ...updated,
              },
            }
          : current
      );
      showSuccess('Draft saved to the client file');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save draft answers');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAsStaff = async (): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const nextDetail = await staffCaseFormsApiClient.submit(caseId, detail.assignment.id, {
        answers: draftAnswers,
        client_submission_id: createId(),
      });
      setDetail(nextDetail);
      syncAssignmentList(nextDetail.assignment);
      showSuccess('Form submitted and recorded on the client file');
      onChanged?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await staffCaseFormsApiClient.send(caseId, detail.assignment.id, {
        delivery_target: deliveryTarget,
        recipient_email: emailDeliveryEnabled ? editorRecipientEmail || undefined : undefined,
        expires_in_days: emailDeliveryEnabled ? Number(sendExpiryDays) || 7 : undefined,
      });
      syncAssignmentList(updated);
      setDetail((current) =>
        current
          ? {
              ...current,
              assignment: {
                ...current.assignment,
                ...updated,
                access_link_url: updated.access_link_url ?? null,
              },
            }
          : current
      );
      setDeliveryTarget(
        resolveDeliveryTarget(updated.delivery_target, updated.recipient_email || editorRecipientEmail || null)
      );
      showSuccess(successMessageForTarget(deliveryTarget));
      onChanged?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to send form');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewDecision = async (decision: CaseFormReviewDecision['decision']): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const updated = await staffCaseFormsApiClient.review(caseId, detail.assignment.id, {
        decision,
        notes: reviewNotes || null,
      });
      syncAssignmentList(updated);
      setDetail((current) =>
        current
          ? {
              ...current,
              assignment: {
                ...current.assignment,
                ...updated,
              },
            }
          : current
      );
      setReviewNotes('');
      showSuccess(decision === 'revision_requested' ? 'Form sent back for changes' : `Form marked ${decision}`);
      onChanged?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to update review status');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAsset = async (
    question: CaseFormQuestion,
    file: File
  ): Promise<CaseFormAsset> => {
    if (!detail) {
      throw new Error('Form assignment is not loaded');
    }

    const asset = await staffCaseFormsApiClient.uploadAsset(caseId, detail.assignment.id, {
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
              draft_assets: [
                ...(current.assignment.draft_assets || []).filter((item) => item.id !== asset.id),
                {
                  ...asset,
                  download_url: staffCaseFormsApiClient.getAssetDownloadUrl(caseId, detail.assignment.id, asset.id),
                },
              ],
            },
          }
        : current
    );

    return {
      ...asset,
      download_url: staffCaseFormsApiClient.getAssetDownloadUrl(caseId, detail.assignment.id, asset.id),
    };
  };

  const handleCopyAccessLink = (): void => {
    if (!assignmentAccessLinkUrl) return;
    void navigator.clipboard.writeText(assignmentAccessLinkUrl);
    showSuccess('Secure link copied');
  };

  if (loading) {
    return (
      <BrutalCard color="white" className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <span className="text-sm font-black uppercase">Loading forms…</span>
        </div>
      </BrutalCard>
    );
  }

  return (
    <div className="space-y-6">
      <CaseFormsSidebar
        assignments={assignments}
        creating={creating}
        recommendedDefaults={recommendedDefaults}
        selectedAssignmentId={selectedAssignmentId}
        onCreateBlankForm={() => void handleCreateBlankForm()}
        onInstantiateDefault={(formDefault) => void handleInstantiateDefault(formDefault)}
        onSelectAssignment={setSelectedAssignmentId}
      />

      {detail ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <CaseFormsBuilderCard
              detail={detail}
              editorDescription={editorDescription}
              editorDueAt={editorDueAt}
              editorRecipientEmail={editorRecipientEmail}
              editorSchema={editorSchema}
              editorTitle={editorTitle}
              logicDrafts={logicDrafts}
              saving={saving}
              sendExpiryDays={sendExpiryDays}
              onSaveStructure={() => void handleSaveStructure()}
              onSchemaChange={setEditorSchema}
              setEditorDescription={setEditorDescription}
              setEditorDueAt={setEditorDueAt}
              setEditorRecipientEmail={setEditorRecipientEmail}
              setEditorTitle={setEditorTitle}
              setLogicDrafts={setLogicDrafts}
              setSendExpiryDays={setSendExpiryDays}
            />
            <CaseFormsAssignmentActionsCard
              caseId={caseId}
              clientViewable={clientViewable}
              deliveryTarget={deliveryTarget}
              detail={detail}
              emailDeliveryEnabled={emailDeliveryEnabled}
              canShowAccessLink={canShowAccessLink}
              recipientEmail={editorRecipientEmail}
              reviewNotes={reviewNotes}
              saving={saving}
              onChangeDeliveryTarget={setDeliveryTarget}
              setReviewNotes={setReviewNotes}
              onCopyAccessLink={handleCopyAccessLink}
              onReviewDecision={(decision) => void handleReviewDecision(decision)}
              onSaveDraft={() => void handleSaveDraft()}
              onSend={() => void handleSend()}
              onSubmitAsStaff={() => void handleSubmitAsStaff()}
            />
          </div>

          <CaseFormsPreviewHistory
            assets={assets}
            detail={detail}
            draftAnswers={draftAnswers}
            editorDescription={editorDescription}
            editorSchema={editorSchema}
            editorTitle={editorTitle}
            onAnswerChange={(questionKey, value) =>
              setDraftAnswers((current) => ({
                ...current,
                [questionKey]: value,
              }))
            }
            onUploadAsset={handleUploadAsset}
          />
        </div>
      ) : (
        <BrutalCard color="white" className="p-8 text-center">
          <h3 className="text-lg font-black uppercase">No Form Selected</h3>
          <p className="mt-2 text-sm text-black/70">
            Pick a case form from the queue above or add a recommended default to begin.
          </p>
        </BrutalCard>
      )}
    </div>
  );
}
