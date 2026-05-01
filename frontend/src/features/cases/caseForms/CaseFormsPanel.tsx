import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrutalCard } from '../../../components/neo-brutalist';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  CaseFormAsset,
  CaseFormDeliveryChannel,
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
  resolveDeliveryChannels,
  successMessageForChannels,
  usesChannel,
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
  const [templateLibrary, setTemplateLibrary] = useState<CaseFormDefault[]>([]);
  const [recommendedDefaults, setRecommendedDefaults] = useState<CaseFormDefault[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseFormAssignmentDetail | null>(null);
  const [editorTitle, setEditorTitle] = useState('Client Intake Form');
  const [editorDescription, setEditorDescription] = useState('');
  const [editorDueAt, setEditorDueAt] = useState('');
  const [editorRecipientEmail, setEditorRecipientEmail] = useState(clientEmail || '');
  const [editorRecipientPhone, setEditorRecipientPhone] = useState('');
  const [editorSchema, setEditorSchema] = useState<CaseFormSchema>(createBlankSchema('Client Intake Form'));
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [sendExpiryDays, setSendExpiryDays] = useState('7');
  const [deliveryChannels, setDeliveryChannels] = useState<CaseFormDeliveryChannel[]>(
    resolveDeliveryChannels(null, null, clientEmail || null)
  );
  const [structureAutosaveStatus, setStructureAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  );
  const [draftAutosaveStatus, setDraftAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [logicDrafts, setLogicDrafts] = useState<Record<string, string>>({});
  const structureSnapshotRef = useRef('');
  const draftSnapshotRef = useRef('');

  const syncAssignmentList = useCallback((updatedAssignment: CaseFormAssignment): void => {
    setAssignments((current) => {
      const existing = current.find((item) => item.id === updatedAssignment.id);
      if (!existing) {
        return [updatedAssignment, ...current];
      }
      return current.map((item) => (item.id === updatedAssignment.id ? { ...item, ...updatedAssignment } : item));
    });
  }, []);

  const buildStructureSnapshot = useCallback(
    () =>
      JSON.stringify({
        title: editorTitle,
        description: editorDescription,
        dueAt: editorDueAt,
        recipientEmail: editorRecipientEmail,
        recipientPhone: editorRecipientPhone,
        schema: {
          ...editorSchema,
          title: editorTitle,
          description: editorDescription,
        },
      }),
    [editorDescription, editorDueAt, editorRecipientEmail, editorRecipientPhone, editorSchema, editorTitle]
  );

  const loadAssignments = useCallback(async (preserveSelection = true): Promise<void> => {
    setLoading(true);
    try {
      const [templates, defaults, assignmentList] = await Promise.all([
        staffCaseFormsApiClient.listTemplates({ status: 'published' }),
        staffCaseFormsApiClient.listRecommendedDefaults(caseId),
        staffCaseFormsApiClient.listAssignments(caseId),
      ]);
      setTemplateLibrary(templates);
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
      setEditorRecipientPhone(nextDetail.assignment.recipient_phone || '');
      setEditorSchema(nextDetail.assignment.schema);
      setDraftAnswers(nextDetail.assignment.current_draft_answers || {});
      setDeliveryChannels(
        resolveDeliveryChannels(
          nextDetail.assignment.delivery_channels,
          nextDetail.assignment.delivery_target,
          nextDetail.assignment.recipient_email || clientEmail || null
        )
      );
      structureSnapshotRef.current = JSON.stringify({
        title: nextDetail.assignment.title,
        description: nextDetail.assignment.description || '',
        dueAt:
          typeof nextDetail.assignment.due_at === 'string'
            ? nextDetail.assignment.due_at.slice(0, 16)
            : '',
        recipientEmail: nextDetail.assignment.recipient_email || clientEmail || '',
        recipientPhone: nextDetail.assignment.recipient_phone || '',
        schema: nextDetail.assignment.schema,
      });
      draftSnapshotRef.current = JSON.stringify(nextDetail.assignment.current_draft_answers || {});
      setStructureAutosaveStatus('idle');
      setDraftAutosaveStatus('idle');
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

  useEffect(() => {
    if (!detail) return;
    const snapshot = buildStructureSnapshot();
    if (snapshot === structureSnapshotRef.current) return;

    setStructureAutosaveStatus('saving');
    const timeout = window.setTimeout(() => {
      void staffCaseFormsApiClient
        .updateAssignment(caseId, detail.assignment.id, {
          title: editorTitle,
          description: editorDescription || null,
          due_at: editorDueAt ? new Date(editorDueAt).toISOString() : null,
          recipient_email: editorRecipientEmail || null,
          recipient_phone: editorRecipientPhone || null,
          schema: {
            ...editorSchema,
            title: editorTitle,
            description: editorDescription,
          },
          autosave: true,
        })
        .then((updated) => {
          structureSnapshotRef.current = snapshot;
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
          setStructureAutosaveStatus('saved');
          onChanged?.();
        })
        .catch(() => {
          setStructureAutosaveStatus('error');
        });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [
    buildStructureSnapshot,
    caseId,
    detail,
    editorDescription,
    editorDueAt,
    editorRecipientEmail,
    editorRecipientPhone,
    editorSchema,
    editorTitle,
    onChanged,
    syncAssignmentList,
  ]);

  useEffect(() => {
    if (!detail) return;
    const snapshot = JSON.stringify(draftAnswers);
    if (snapshot === draftSnapshotRef.current) return;

    setDraftAutosaveStatus('saving');
    const timeout = window.setTimeout(() => {
      void staffCaseFormsApiClient
        .saveDraft(caseId, detail.assignment.id, {
          answers: draftAnswers,
        })
        .then((updated) => {
          draftSnapshotRef.current = snapshot;
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
          setDraftAutosaveStatus('saved');
        })
        .catch(() => {
          setDraftAutosaveStatus('error');
        });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [caseId, detail, draftAnswers, syncAssignmentList]);

  const assignment = detail?.assignment ?? null;
  const assignmentAccessLinkUrl = assignment?.access_link_url ?? null;
  const assignmentHasSecureLinkDelivery = Boolean(
    assignment?.delivery_channels?.some((channel) => channel === 'email' || channel === 'sms') ||
      assignment?.delivery_target === 'email' ||
      assignment?.delivery_target === 'portal_and_email'
  );
  const assets = useMemo(() => collectAssets(detail), [detail]);
  const emailDeliveryEnabled = usesChannel(deliveryChannels, 'email');
  const smsDeliveryEnabled = usesChannel(deliveryChannels, 'sms');
  const canShowAccessLink = Boolean(assignmentAccessLinkUrl) && assignmentHasSecureLinkDelivery;

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

  const handleCreateTemplateDraft = async (): Promise<void> => {
    setCreating(true);
    try {
      const title = `Draft Form Template ${templateLibrary.length + 1}`;
      const created = await staffCaseFormsApiClient.createTemplate({
        title,
        description: 'Reusable case form template draft.',
        schema: createBlankSchema(title),
        template_status: 'draft',
        is_active: true,
      });
      setTemplateLibrary((current) => [created, ...current]);
      showSuccess('Draft template created');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create draft template');
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

  const handleSaveAssignmentAsTemplate = async (): Promise<void> => {
    if (!detail) return;
    setSaving(true);
    try {
      const created = await staffCaseFormsApiClient.saveAssignmentAsTemplate(caseId, detail.assignment.id, {
        title: `${editorTitle} Template`,
        description: editorDescription || undefined,
        schema: {
          ...editorSchema,
          title: editorTitle,
          description: editorDescription,
        },
        case_type_id: detail.assignment.case_type_id || null,
        template_status: 'draft',
        is_active: true,
      });
      setTemplateLibrary((current) => [created, ...current]);
      showSuccess('Customized form saved as a draft template');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setSaving(false);
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
        recipient_phone: editorRecipientPhone || null,
        schema: {
          ...editorSchema,
          title: editorTitle,
          description: editorDescription,
        },
      });
      syncAssignmentList(updated);
      structureSnapshotRef.current = buildStructureSnapshot();
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
      draftSnapshotRef.current = JSON.stringify(draftAnswers);
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
        delivery_channels: deliveryChannels,
        recipient_email: emailDeliveryEnabled ? editorRecipientEmail || undefined : undefined,
        recipient_phone: smsDeliveryEnabled ? editorRecipientPhone || undefined : undefined,
        expires_in_days: emailDeliveryEnabled || smsDeliveryEnabled ? Number(sendExpiryDays) || 7 : undefined,
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
      setDeliveryChannels(
        resolveDeliveryChannels(
          updated.delivery_channels,
          updated.delivery_target,
          updated.recipient_email || editorRecipientEmail || null
        )
      );
      showSuccess(successMessageForChannels(deliveryChannels));
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
        templateLibrary={templateLibrary}
        onCreateBlankForm={() => void handleCreateBlankForm()}
        onCreateTemplateDraft={() => void handleCreateTemplateDraft()}
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
              editorRecipientPhone={editorRecipientPhone}
              editorSchema={editorSchema}
              editorTitle={editorTitle}
              logicDrafts={logicDrafts}
              saving={saving}
              sendExpiryDays={sendExpiryDays}
              structureAutosaveStatus={structureAutosaveStatus}
              onSaveStructure={() => void handleSaveStructure()}
              onSaveAsTemplate={() => void handleSaveAssignmentAsTemplate()}
              onSchemaChange={setEditorSchema}
              setEditorDescription={setEditorDescription}
              setEditorDueAt={setEditorDueAt}
              setEditorRecipientEmail={setEditorRecipientEmail}
              setEditorRecipientPhone={setEditorRecipientPhone}
              setEditorTitle={setEditorTitle}
              setLogicDrafts={setLogicDrafts}
              setSendExpiryDays={setSendExpiryDays}
            />
            <CaseFormsAssignmentActionsCard
              caseId={caseId}
              clientViewable={clientViewable}
              deliveryChannels={deliveryChannels}
              detail={detail}
              draftAutosaveStatus={draftAutosaveStatus}
              emailDeliveryEnabled={emailDeliveryEnabled}
              smsDeliveryEnabled={smsDeliveryEnabled}
              canShowAccessLink={canShowAccessLink}
              recipientEmail={editorRecipientEmail}
              recipientPhone={editorRecipientPhone}
              reviewNotes={reviewNotes}
              saving={saving}
              onChangeDeliveryChannels={setDeliveryChannels}
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
