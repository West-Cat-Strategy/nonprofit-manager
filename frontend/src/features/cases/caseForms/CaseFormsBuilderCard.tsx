import type { Dispatch, SetStateAction } from 'react';
import { BrutalButton, BrutalCard } from '../../../components/neo-brutalist';
import type {
  CaseFormAssignmentDetail,
  CaseFormQuestionType,
  CaseFormSchema,
} from '../../../types/caseForms';
import {
  CONTACT_MAPPING_FIELDS,
  createId,
  createQuestion,
  getDefaultPlaceholderForQuestionType,
  getQuestionPlaceholderLabel,
  formatLogicRulesText,
  formatOptionsText,
  parseLogicRulesText,
  parseOptionsText,
  updateQuestionMappingTarget,
} from './caseFormsPanelUtils';

interface CaseFormsBuilderCardProps {
  detail: CaseFormAssignmentDetail;
  editorDescription: string;
  editorDueAt: string;
  editorRecipientEmail: string;
  editorSchema: CaseFormSchema;
  editorTitle: string;
  logicDrafts: Record<string, string>;
  saving: boolean;
  sendExpiryDays: string;
  onSaveStructure: () => void;
  onSchemaChange: (schema: CaseFormSchema) => void;
  setEditorDescription: (value: string) => void;
  setEditorDueAt: (value: string) => void;
  setEditorRecipientEmail: (value: string) => void;
  setEditorTitle: (value: string) => void;
  setLogicDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setSendExpiryDays: (value: string) => void;
}

const CASE_FORM_QUESTION_TYPES: CaseFormQuestionType[] = [
  'text',
  'textarea',
  'email',
  'phone',
  'number',
  'date',
  'select',
  'radio',
  'checkbox',
  'file',
  'signature',
];

export function CaseFormsBuilderCard({
  detail,
  editorDescription,
  editorDueAt,
  editorRecipientEmail,
  editorSchema,
  editorTitle,
  logicDrafts,
  saving,
  sendExpiryDays,
  onSaveStructure,
  onSchemaChange,
  setEditorDescription,
  setEditorDueAt,
  setEditorRecipientEmail,
  setEditorTitle,
  setLogicDrafts,
  setSendExpiryDays,
}: CaseFormsBuilderCardProps) {
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
          questions: [createQuestion(editorSchema.sections.flatMap((section) => section.questions).length + 1)],
        },
      ],
    });
  };

  return (
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
              {section.questions.map((question) => (
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
                        onChange={(event) => {
                          const nextType = event.target.value as CaseFormQuestionType;

                          updateSection(section.id, (current) => ({
                            ...current,
                            questions: current.questions.map((item) =>
                              item.id === question.id
                                ? {
                                    ...item,
                                    type: nextType,
                                    placeholder:
                                      nextType === 'checkbox' &&
                                      !item.multiple &&
                                      !item.placeholder
                                        ? getDefaultPlaceholderForQuestionType(nextType, item.multiple)
                                        : item.placeholder,
                                    options:
                                      ['select', 'radio', 'checkbox'].includes(nextType)
                                        ? item.options || [{ label: 'Option 1', value: 'option_1' }]
                                        : undefined,
                                  }
                                : item
                            ),
                          }));
                        }}
                        className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                      >
                        {CASE_FORM_QUESTION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-black uppercase text-black/70">
                        {getQuestionPlaceholderLabel(question)}
                      </label>
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
                              item.id === question.id
                                ? {
                                    ...item,
                                    multiple: event.target.checked,
                                    placeholder:
                                      !event.target.checked &&
                                      item.type === 'checkbox' &&
                                      !item.placeholder
                                        ? getDefaultPlaceholderForQuestionType(item.type, false)
                                        : item.placeholder,
                                  }
                                : item
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
                        value={question.mapping_target?.entity ? question.mapping_target.entity : 'none'}
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
      </div>
    </BrutalCard>
  );
}
