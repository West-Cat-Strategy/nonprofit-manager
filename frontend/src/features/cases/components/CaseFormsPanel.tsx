import { useEffect, useMemo, useState } from 'react';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import { useToast } from '../../../contexts/useToast';
import type {
  CaseFormAssignment,
  CaseFormAssignmentDetail,
  CaseFormAsset,
  CaseFormDefault,
  CaseFormMappingTarget,
  CaseFormQuestion,
  CaseFormQuestionType,
  CaseFormSchema,
} from '../../../types/caseForms';
import { staffCaseFormsApiClient } from '../api/caseFormsApiClient';
import CaseFormRenderer from './CaseFormRenderer';

interface CaseFormsPanelProps {
  caseId: string;
  clientEmail?: string | null;
  onChanged?: () => void;
}

const createId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `cf_${Math.random().toString(36).slice(2, 10)}`;

const createQuestion = (index: number, type: CaseFormQuestionType = 'text'): CaseFormQuestion => ({
  id: createId(),
  key: `question_${index}`,
  type,
  label: `Question ${index}`,
  helper_text: '',
  placeholder: '',
  required: false,
  mapping_target: null,
});

const CONTACT_MAPPING_FIELDS = [
  'first_name',
  'preferred_name',
  'last_name',
  'middle_name',
  'salutation',
  'suffix',
  'email',
  'phone',
  'mobile_phone',
  'birth_date',
  'gender',
  'pronouns',
  'address_line1',
  'address_line2',
  'city',
  'state_province',
  'postal_code',
  'country',
  'job_title',
  'department',
  'preferred_contact_method',
  'no_fixed_address',
  'do_not_email',
  'do_not_phone',
  'do_not_sms',
  'do_not_voicemail',
];

const createBlankSchema = (title: string): CaseFormSchema => ({
  version: 1,
  title,
  description: '',
  sections: [
    {
      id: createId(),
      title: 'Section 1',
      description: '',
      questions: [createQuestion(1)],
    },
  ],
});

const parseOptionsText = (value: string): Array<{ label: string; value: string }> =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, rawValue] = line.split('|').map((part) => part.trim());
      return {
        label,
        value: rawValue || label,
      };
    });

const formatOptionsText = (options?: Array<{ label: string; value: string }>): string =>
  (options || []).map((option) => `${option.label}|${option.value}`).join('\n');

const formatLogicRulesText = (question: CaseFormQuestion): string =>
  question.visible_when?.length ? JSON.stringify(question.visible_when, null, 2) : '';

const parseLogicRulesText = (value: string): CaseFormQuestion['visible_when'] => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const updateQuestionMappingTarget = (
  current: CaseFormMappingTarget | null | undefined,
  patch: Partial<CaseFormMappingTarget>,
  mode?: 'none' | 'contact' | 'case'
): CaseFormMappingTarget | null => {
  if (mode === 'none') {
    return null;
  }

  const base: CaseFormMappingTarget =
    mode === 'contact'
      ? { entity: 'contact', field: '' }
      : mode === 'case'
        ? { entity: 'case', container: 'intake_data', key: '' }
        : current || { entity: 'contact', field: '' };

  return {
    ...base,
    ...patch,
  };
};

const collectAssets = (detail: CaseFormAssignmentDetail | null): CaseFormAsset[] => {
  if (!detail) return [];
  const submissionAssets = detail.submissions.flatMap((submission) => [
    ...submission.asset_refs,
    ...submission.signature_refs,
  ]);
  return [...(detail.assignment.draft_assets || []), ...submissionAssets];
};

export default function CaseFormsPanel({
  caseId,
  clientEmail,
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
  const [logicDrafts, setLogicDrafts] = useState<Record<string, string>>({});

  const loadAssignments = async (preserveSelection = true): Promise<void> => {
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
  };

  const loadDetail = async (assignmentId: string): Promise<void> => {
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
      setLogicDrafts({});
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load form detail');
    }
  };

  useEffect(() => {
    void loadAssignments(false);
  }, [caseId]);

  useEffect(() => {
    if (selectedAssignmentId) {
      void loadDetail(selectedAssignmentId);
    } else {
      setDetail(null);
    }
  }, [selectedAssignmentId]);

  const assets = useMemo(() => collectAssets(detail), [detail]);

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

  const handleSchemaChange = (nextSchema: CaseFormSchema): void => {
    setEditorSchema(nextSchema);
  };

  const updateSection = (
    sectionId: string,
    updater: (section: CaseFormSchema['sections'][number]) => CaseFormSchema['sections'][number]
  ): void => {
    handleSchemaChange({
      ...editorSchema,
      sections: editorSchema.sections.map((section) =>
        section.id === sectionId ? updater(section) : section
      ),
    });
  };

  const handleAddSection = (): void => {
    handleSchemaChange({
      ...editorSchema,
      sections: [
        ...editorSchema.sections,
        {
          id: createId(),
          title: `Section ${editorSchema.sections.length + 1}`,
          description: '',
          questions: [createQuestion(editorSchema.sections.flatMap((section) => section.questions).length + 1)],
        },
      ],
    });
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
        send_email: Boolean(editorRecipientEmail),
        recipient_email: editorRecipientEmail || undefined,
        expires_in_days: Number(sendExpiryDays) || 7,
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
      showSuccess(editorRecipientEmail ? 'Secure form email sent' : 'Secure form link generated');
      onChanged?.();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to send form');
    } finally {
      setSaving(false);
    }
  };

  const handleReviewDecision = async (
    decision: 'reviewed' | 'closed' | 'cancelled'
  ): Promise<void> => {
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
      showSuccess(`Form marked ${decision}`);
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
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
        <BrutalCard color="white" className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase">Recommended Defaults</h3>
              <p className="text-sm text-black/70">
                Start from the active defaults attached to this case’s selected types.
              </p>
            </div>
            <BrutalButton onClick={() => void handleCreateBlankForm()} disabled={creating} size="sm">
              {creating ? 'Creating…' : '+ Blank Form'}
            </BrutalButton>
          </div>

          <div className="space-y-3">
            {recommendedDefaults.length === 0 && (
              <div className="rounded border-2 border-dashed border-black p-4 text-sm font-semibold text-black/65">
                No active case-type defaults are recommended for this case yet.
              </div>
            )}
            {recommendedDefaults.map((formDefault) => (
              <div key={formDefault.id} className="rounded border-2 border-black bg-[var(--loop-yellow)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase">{formDefault.title}</p>
                    {formDefault.description && (
                      <p className="mt-1 text-sm text-black/70">{formDefault.description}</p>
                    )}
                    <p className="mt-2 text-xs font-semibold uppercase text-black/60">
                      v{formDefault.version} • {formDefault.schema.sections.length} sections
                    </p>
                  </div>
                  <BrutalButton
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleInstantiateDefault(formDefault)}
                  >
                    Add to Case
                  </BrutalButton>
                </div>
              </div>
            ))}
          </div>
        </BrutalCard>

        <BrutalCard color="white" className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase">Case Forms Queue</h3>
              <p className="text-sm text-black/70">
                Every instantiated form becomes an editable case-owned copy with its own draft and submission history.
              </p>
            </div>
            <span className="rounded border-2 border-black bg-[var(--loop-cyan)] px-3 py-1 text-xs font-black uppercase">
              {assignments.length} total
            </span>
          </div>

          <div className="space-y-3">
            {assignments.length === 0 && (
              <div className="rounded border-2 border-dashed border-black p-4 text-sm font-semibold text-black/65">
                No form assignments exist for this case yet. Add a recommended default or start a blank form.
              </div>
            )}
            {assignments.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                onClick={() => setSelectedAssignmentId(assignment.id)}
                className={`w-full rounded border-2 p-4 text-left transition ${
                  selectedAssignmentId === assignment.id
                    ? 'border-black bg-[var(--loop-green)]'
                    : 'border-black bg-white hover:bg-[var(--loop-yellow)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase">{assignment.title}</p>
                    {assignment.description && (
                      <p className="mt-1 text-sm text-black/70">{assignment.description}</p>
                    )}
                  </div>
                  <span className="rounded border border-black px-2 py-1 text-[11px] font-black uppercase">
                    {assignment.status.replace('_', ' ')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </BrutalCard>
      </div>

      {detail ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <BrutalCard color="white" className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black uppercase">Builder</h3>
                  <p className="text-sm text-black/70">
                    Edit the case-owned form copy without mutating the original default.
                  </p>
                </div>
                <span className="rounded border-2 border-black px-3 py-1 text-xs font-black uppercase">
                  {detail.assignment.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-black/70">Title</label>
                  <input
                    value={editorTitle}
                    onChange={(event) => setEditorTitle(event.target.value)}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-black/70">Recipient Email</label>
                  <input
                    type="email"
                    value={editorRecipientEmail}
                    onChange={(event) => setEditorRecipientEmail(event.target.value)}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-black uppercase text-black/70">Description</label>
                  <textarea
                    value={editorDescription}
                    onChange={(event) => setEditorDescription(event.target.value)}
                    rows={3}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-black/70">Due At</label>
                  <input
                    type="datetime-local"
                    value={editorDueAt}
                    onChange={(event) => setEditorDueAt(event.target.value)}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black uppercase text-black/70">Email Link Expiry (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={sendExpiryDays}
                    onChange={(event) => setSendExpiryDays(event.target.value)}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {editorSchema.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded border-2 border-black bg-[var(--loop-cyan)] p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-black uppercase text-black/70">Section Title</label>
                        <input
                          value={section.title}
                          onChange={(event) =>
                            updateSection(section.id, (current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-black uppercase text-black/70">Section Description</label>
                        <input
                          value={section.description || ''}
                          onChange={(event) =>
                            updateSection(section.id, (current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {section.questions.map((question, questionIndex) => (
                        <div key={question.id} className="rounded border-2 border-black bg-white p-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-black/70">Question Label</label>
                              <input
                                value={question.label}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id ? { ...item, label: event.target.value } : item
                                    ),
                                  }))
                                }
                                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-black/70">Question Key</label>
                              <input
                                value={question.key}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id ? { ...item, key: event.target.value } : item
                                    ),
                                  }))
                                }
                                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-black/70">Type</label>
                              <select
                                value={question.type}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id
                                        ? {
                                            ...item,
                                            type: event.target.value as CaseFormQuestionType,
                                            options:
                                              ['select', 'radio', 'checkbox'].includes(event.target.value)
                                                ? item.options || [{ label: 'Option 1', value: 'option_1' }]
                                                : undefined,
                                          }
                                        : item
                                    ),
                                  }))
                                }
                                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                              >
                                {(['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'radio', 'checkbox', 'file', 'signature'] as CaseFormQuestionType[]).map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-black/70">Placeholder</label>
                              <input
                                value={question.placeholder || ''}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id ? { ...item, placeholder: event.target.value } : item
                                    ),
                                  }))
                                }
                                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="lg:col-span-2">
                              <label className="mb-1 block text-xs font-black uppercase text-black/70">Helper Text</label>
                              <textarea
                                value={question.helper_text || ''}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id ? { ...item, helper_text: event.target.value } : item
                                    ),
                                  }))
                                }
                                rows={2}
                                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 text-xs font-black uppercase">
                              <input
                                type="checkbox"
                                checked={question.required === true}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id ? { ...item, required: event.target.checked } : item
                                    ),
                                  }))
                                }
                              />
                              Required
                            </label>
                            <label className="flex items-center gap-2 text-xs font-black uppercase">
                              <input
                                type="checkbox"
                                checked={question.multiple === true}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id ? { ...item, multiple: event.target.checked } : item
                                    ),
                                  }))
                                }
                              />
                              Multiple
                            </label>
                          </div>

                          {['select', 'radio', 'checkbox'].includes(question.type) && (
                            <div className="mt-3">
                              <label className="mb-1 block text-xs font-black uppercase text-black/70">
                                Options (one per line, `Label|value`)
                              </label>
                              <textarea
                                value={formatOptionsText(question.options)}
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id
                                        ? { ...item, options: parseOptionsText(event.target.value) }
                                        : item
                                    ),
                                  }))
                                }
                                rows={3}
                                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                              />
                            </div>
                          )}

                          {(question.type === 'file' || question.type === 'signature') && (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-black uppercase text-black/70">
                                  Accepted MIME Types
                                </label>
                                <input
                                  value={(question.upload_config?.accept || []).join(',')}
                                  onChange={(event) =>
                                    updateSection(section.id, (current) => ({
                                      ...current,
                                      questions: current.questions.map((item) =>
                                        item.id === question.id
                                          ? {
                                              ...item,
                                              upload_config: {
                                                ...item.upload_config,
                                                accept: event.target.value
                                                  .split(',')
                                                  .map((part) => part.trim())
                                                  .filter(Boolean),
                                              },
                                            }
                                          : item
                                      ),
                                    }))
                                  }
                                  placeholder="image/png,image/jpeg,application/pdf"
                                  className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-black uppercase text-black/70">
                                  Max Files
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={question.upload_config?.max_files || 1}
                                  onChange={(event) =>
                                    updateSection(section.id, (current) => ({
                                      ...current,
                                      questions: current.questions.map((item) =>
                                        item.id === question.id
                                          ? {
                                              ...item,
                                              upload_config: {
                                                ...item.upload_config,
                                                max_files: Number(event.target.value) || 1,
                                              },
                                            }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                                />
                              </div>
                            </div>
                          )}

                          <div className="mt-3 grid gap-3 lg:grid-cols-3">
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-black/70">
                                Mapping Target
                              </label>
                              <select
                                value={
                                  question.mapping_target?.entity
                                    ? question.mapping_target.entity
                                    : 'none'
                                }
                                onChange={(event) =>
                                  updateSection(section.id, (current) => ({
                                    ...current,
                                    questions: current.questions.map((item) =>
                                      item.id === question.id
                                        ? {
                                            ...item,
                                            mapping_target: updateQuestionMappingTarget(
                                              item.mapping_target,
                                              {},
                                              event.target.value as 'none' | 'contact' | 'case'
                                            ),
                                          }
                                        : item
                                    ),
                                  }))
                                }
                                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                              >
                                <option value="none">No automatic writeback</option>
                                <option value="contact">Contact profile field</option>
                                <option value="case">Case intake/custom data</option>
                              </select>
                            </div>

                            {question.mapping_target?.entity === 'contact' && (
                              <div className="lg:col-span-2">
                                <label className="mb-1 block text-xs font-black uppercase text-black/70">
                                  Contact Field
                                </label>
                                <select
                                  value={question.mapping_target.field || ''}
                                  onChange={(event) =>
                                    updateSection(section.id, (current) => ({
                                      ...current,
                                      questions: current.questions.map((item) =>
                                        item.id === question.id
                                          ? {
                                              ...item,
                                              mapping_target: updateQuestionMappingTarget(item.mapping_target, {
                                                entity: 'contact',
                                                field: event.target.value,
                                              }),
                                            }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                                >
                                  <option value="">Choose a contact field</option>
                                  {CONTACT_MAPPING_FIELDS.map((field) => (
                                    <option key={field} value={field}>
                                      {field}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {question.mapping_target?.entity === 'case' && (
                              <>
                                <div>
                                  <label className="mb-1 block text-xs font-black uppercase text-black/70">
                                    Case Container
                                  </label>
                                  <select
                                    value={question.mapping_target.container || 'intake_data'}
                                    onChange={(event) =>
                                      updateSection(section.id, (current) => ({
                                        ...current,
                                        questions: current.questions.map((item) =>
                                          item.id === question.id
                                            ? {
                                                ...item,
                                                mapping_target: updateQuestionMappingTarget(item.mapping_target, {
                                                  entity: 'case',
                                                  container: event.target.value as 'intake_data' | 'custom_data',
                                                }),
                                              }
                                            : item
                                        ),
                                      }))
                                    }
                                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                                  >
                                    <option value="intake_data">intake_data</option>
                                    <option value="custom_data">custom_data</option>
                                  </select>
                                </div>
                                <div className="lg:col-span-2">
                                  <label className="mb-1 block text-xs font-black uppercase text-black/70">
                                    Case JSON Key
                                  </label>
                                  <input
                                    value={question.mapping_target.key || ''}
                                    onChange={(event) =>
                                      updateSection(section.id, (current) => ({
                                        ...current,
                                        questions: current.questions.map((item) =>
                                          item.id === question.id
                                            ? {
                                                ...item,
                                                mapping_target: updateQuestionMappingTarget(item.mapping_target, {
                                                  entity: 'case',
                                                  key: event.target.value,
                                                }),
                                              }
                                            : item
                                        ),
                                      }))
                                    }
                                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          <div className="mt-3">
                            <label className="mb-1 block text-xs font-black uppercase text-black/70">
                              Conditional Visibility Rules (JSON)
                            </label>
                            <textarea
                              value={logicDrafts[question.id] ?? formatLogicRulesText(question)}
                              onChange={(event) =>
                                setLogicDrafts((current) => ({
                                  ...current,
                                  [question.id]: event.target.value,
                                }))
                              }
                              onBlur={() =>
                                updateSection(section.id, (current) => ({
                                  ...current,
                                  questions: current.questions.map((item) =>
                                    item.id === question.id
                                      ? {
                                          ...item,
                                          visible_when: parseLogicRulesText(
                                            logicDrafts[question.id] ?? formatLogicRulesText(question)
                                          ),
                                        }
                                      : item
                                  ),
                                }))
                              }
                              rows={4}
                              placeholder='[{"question_key":"question_1","operator":"equals","value":"yes"}]'
                              className="w-full border-2 border-black bg-app-surface px-3 py-2 font-mono text-xs"
                            />
                          </div>

                          <div className="mt-3 flex justify-end gap-2">
                            <BrutalButton
                              size="sm"
                              variant="danger"
                              onClick={() =>
                                updateSection(section.id, (current) => ({
                                  ...current,
                                  questions: current.questions.filter((item) => item.id !== question.id),
                                }))
                              }
                              disabled={section.questions.length === 1}
                            >
                              Remove Question
                            </BrutalButton>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-between gap-3">
                      <BrutalButton
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            questions: [...current.questions, createQuestion(current.questions.length + sectionIndex + 1)],
                          }))
                        }
                      >
                        + Question
                      </BrutalButton>
                      <BrutalButton
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          handleSchemaChange({
                            ...editorSchema,
                            sections: editorSchema.sections.filter((item) => item.id !== section.id),
                          })
                        }
                        disabled={editorSchema.sections.length === 1}
                      >
                        Remove Section
                      </BrutalButton>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <BrutalButton onClick={handleAddSection} variant="secondary">
                  + Section
                </BrutalButton>
                <BrutalButton onClick={() => void handleSaveStructure()} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Structure'}
                </BrutalButton>
              </div>
            </BrutalCard>

            <BrutalCard color="white" className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black uppercase">Assignment Actions</h3>
                  <p className="text-sm text-black/70">
                    Save staff-entered answers, send the secure link, or move the submission through review.
                  </p>
                </div>
                {detail.assignment.access_link_url && (
                  <button
                    type="button"
                    className="rounded border-2 border-black bg-[var(--loop-yellow)] px-3 py-2 text-xs font-black uppercase"
                    onClick={() => {
                      void navigator.clipboard.writeText(detail.assignment.access_link_url || '');
                      showSuccess('Secure link copied');
                    }}
                  >
                    Copy Link
                  </button>
                )}
              </div>

              {detail.assignment.access_link_url && (
                <div className="rounded border-2 border-black bg-app-surface px-3 py-2 text-xs font-semibold">
                  {detail.assignment.access_link_url}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <BrutalButton onClick={() => void handleSaveDraft()} disabled={saving} variant="secondary">
                  Save Draft
                </BrutalButton>
                <BrutalButton onClick={() => void handleSubmitAsStaff()} disabled={saving}>
                  Submit as Staff
                </BrutalButton>
                <BrutalButton onClick={() => void handleSend()} disabled={saving} variant="secondary">
                  Send to Client
                </BrutalButton>
                <a
                  href={staffCaseFormsApiClient.getResponsePacketDownloadUrl(caseId, detail.assignment.id)}
                  className="inline-flex items-center rounded border-2 border-black bg-white px-4 py-2 text-sm font-black uppercase"
                  target="_blank"
                  rel="noreferrer"
                >
                  Response Packet
                </a>
              </div>

              <div className="rounded border-2 border-black bg-[var(--loop-pink)] p-4 space-y-3">
                <label className="block text-xs font-black uppercase text-black/70">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                  rows={3}
                  className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-3">
                  <BrutalButton onClick={() => void handleReviewDecision('reviewed')} disabled={saving} size="sm">
                    Mark Reviewed
                  </BrutalButton>
                  <BrutalButton onClick={() => void handleReviewDecision('closed')} disabled={saving} size="sm" variant="secondary">
                    Close
                  </BrutalButton>
                  <BrutalButton onClick={() => void handleReviewDecision('cancelled')} disabled={saving} size="sm" variant="danger">
                    Cancel
                  </BrutalButton>
                </div>
              </div>
            </BrutalCard>
          </div>

          <div className="space-y-6">
            <BrutalCard color="white" className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-black uppercase">Live Preview</h3>
                <p className="text-sm text-black/70">
                  Staff and clients answer the same schema. This preview uses the current draft values and draft assets.
                </p>
              </div>
              <CaseFormRenderer
                schema={{ ...editorSchema, title: editorTitle, description: editorDescription }}
                answers={draftAnswers}
                assets={assets}
                variant="staff"
                onAnswerChange={(questionKey, value) =>
                  setDraftAnswers((current) => ({
                    ...current,
                    [questionKey]: value,
                  }))
                }
                onUploadAsset={handleUploadAsset}
              />
            </BrutalCard>

            <BrutalCard color="white" className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-black uppercase">Submission History</h3>
                <p className="text-sm text-black/70">
                  Immutable snapshots recorded onto the client file with packet + attachment filing.
                </p>
              </div>
              <div className="space-y-3">
                {detail.submissions.length === 0 && (
                  <div className="rounded border-2 border-dashed border-black p-4 text-sm font-semibold text-black/65">
                    No submissions yet. Drafts remain editable until staff or the client submits.
                  </div>
                )}
                {detail.submissions.map((submission) => (
                  <div key={submission.id} className="rounded border-2 border-black bg-app-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase">
                          Submission #{submission.submission_number}
                        </p>
                        <p className="text-sm text-black/70">
                          {new Date(submission.created_at).toLocaleString()} • {submission.submitted_by_actor_type}
                        </p>
                      </div>
                      {submission.response_packet_download_url && (
                        <a
                          href={submission.response_packet_download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-black px-2 py-1 text-xs font-black uppercase"
                        >
                          Packet
                        </a>
                      )}
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase text-black/60">
                      {submission.mapping_audit.filter((item) => item.applied).length} mapped fields applied
                    </p>
                  </div>
                ))}
              </div>
            </BrutalCard>
          </div>
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
