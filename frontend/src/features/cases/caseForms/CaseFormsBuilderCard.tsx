import type { Dispatch, SetStateAction } from 'react';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import type {
  CaseFormAssignmentDetail,
  CaseFormLogicRule,
  CaseFormSchema,
} from '../../../types/caseForms';
import {
  collectCaseFormAuthoringDiagnostics,
  createId,
  createQuestion,
  formatLogicRules,
} from './caseFormsPanelUtils';
import { sectionFieldId } from './caseFormBuilderIds';
import { CaseFormsBuilderDiagnostics } from './CaseFormsBuilderDiagnostics';
import { CaseFormsBuilderHeader } from './CaseFormsBuilderHeader';
import { CaseFormsBuilderMetaFields } from './CaseFormsBuilderMetaFields';
import { CaseFormsQuestionEditor } from './CaseFormsQuestionEditor';

interface CaseFormsBuilderCardProps {
  detail: CaseFormAssignmentDetail;
  editorDescription: string;
  editorDueAt: string;
  editorRecipientEmail: string;
  editorRecipientPhone: string;
  editorSchema: CaseFormSchema;
  editorTitle: string;
  logicDrafts: Record<string, string>;
  saving: boolean;
  sendExpiryDays: string;
  structureAutosaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSaveStructure: () => void;
  onSaveAsTemplate: () => void;
  onSchemaChange: (schema: CaseFormSchema) => void;
  setEditorDescription: (value: string) => void;
  setEditorDueAt: (value: string) => void;
  setEditorRecipientEmail: (value: string) => void;
  setEditorRecipientPhone: (value: string) => void;
  setEditorTitle: (value: string) => void;
  setLogicDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setSendExpiryDays: (value: string) => void;
}

export function CaseFormsBuilderCard({
  detail,
  editorDescription,
  editorDueAt,
  editorRecipientEmail,
  editorRecipientPhone,
  editorSchema,
  editorTitle,
  logicDrafts,
  saving,
  sendExpiryDays,
  structureAutosaveStatus,
  onSaveStructure,
  onSaveAsTemplate,
  onSchemaChange,
  setEditorDescription,
  setEditorDueAt,
  setEditorRecipientEmail,
  setEditorRecipientPhone,
  setEditorTitle,
  setLogicDrafts,
  setSendExpiryDays,
}: CaseFormsBuilderCardProps) {
  const authoringDiagnostics = collectCaseFormAuthoringDiagnostics(editorSchema, logicDrafts);
  const allQuestions = editorSchema.sections.flatMap((section) => section.questions);

  const updateSection = (
    sectionId: string,
    updater: (section: CaseFormSchema['sections'][number]) => CaseFormSchema['sections'][number]
  ): void => {
    onSchemaChange({
      ...editorSchema,
      sections: editorSchema.sections.map((section) =>
        section.id === sectionId ? updater(section) : section
      ),
    });
  };

  const handleAddSection = (): void => {
    onSchemaChange({
      ...editorSchema,
      sections: [
        ...editorSchema.sections,
        {
          id: createId(),
          title: `Section ${editorSchema.sections.length + 1}`,
          description: '',
          questions: [
            createQuestion(
              editorSchema.sections.flatMap((section) => section.questions).length + 1
            ),
          ],
        },
      ],
    });
  };

  const updateQuestionVisibleRules = (
    sectionId: string,
    questionId: string,
    rules: CaseFormLogicRule[]
  ): void => {
    const nextRules = rules.length ? rules : undefined;
    updateSection(sectionId, (current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === questionId ? { ...item, visible_when: nextRules } : item
      ),
    }));
    setLogicDrafts((current) => ({
      ...current,
      [questionId]: formatLogicRules(nextRules),
    }));
  };

  return (
    <BrutalCard color="white" className="p-6 space-y-4">
      <CaseFormsBuilderHeader
        assignmentStatus={detail.assignment.status}
        autosaveStatus={structureAutosaveStatus}
      />

      <CaseFormsBuilderDiagnostics diagnostics={authoringDiagnostics} />

      <CaseFormsBuilderMetaFields
        editorDescription={editorDescription}
        editorDueAt={editorDueAt}
        editorRecipientEmail={editorRecipientEmail}
        editorRecipientPhone={editorRecipientPhone}
        editorTitle={editorTitle}
        sendExpiryDays={sendExpiryDays}
        setEditorDescription={setEditorDescription}
        setEditorDueAt={setEditorDueAt}
        setEditorRecipientEmail={setEditorRecipientEmail}
        setEditorRecipientPhone={setEditorRecipientPhone}
        setEditorTitle={setEditorTitle}
        setSendExpiryDays={setSendExpiryDays}
      />

      <div className="space-y-4">
        {editorSchema.sections.map((section, sectionIndex) => (
          <div key={section.id} className="rounded border-2 border-black bg-[var(--loop-cyan)] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label
                  htmlFor={sectionFieldId(section.id, 'title')}
                  className="mb-1 block text-xs font-black uppercase text-black/70"
                >
                  Section Title
                </label>
                <input
                  id={sectionFieldId(section.id, 'title')}
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
                <label
                  htmlFor={sectionFieldId(section.id, 'description')}
                  className="mb-1 block text-xs font-black uppercase text-black/70"
                >
                  Section Description
                </label>
                <input
                  id={sectionFieldId(section.id, 'description')}
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
              {section.questions.map((question) => (
                <CaseFormsQuestionEditor
                  key={question.id}
                  allQuestions={allQuestions}
                  logicDrafts={logicDrafts}
                  question={question}
                  sectionId={section.id}
                  sectionQuestionCount={section.questions.length}
                  setLogicDrafts={setLogicDrafts}
                  updateQuestionVisibleRules={updateQuestionVisibleRules}
                  updateSection={updateSection}
                />
              ))}
            </div>

            <div className="mt-4 flex justify-between gap-3">
              <BrutalButton
                size="sm"
                variant="secondary"
                onClick={() =>
                  updateSection(section.id, (current) => ({
                    ...current,
                    questions: [
                      ...current.questions,
                      createQuestion(current.questions.length + sectionIndex + 1),
                    ],
                  }))
                }
              >
                + Question
              </BrutalButton>
              <BrutalButton
                size="sm"
                variant="danger"
                onClick={() =>
                  onSchemaChange({
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
        <BrutalButton onClick={onSaveStructure} disabled={saving}>
          {saving ? 'Saving…' : 'Save Structure'}
        </BrutalButton>
        <BrutalButton onClick={onSaveAsTemplate} disabled={saving} variant="secondary">
          Save as Template
        </BrutalButton>
      </div>
    </BrutalCard>
  );
}
