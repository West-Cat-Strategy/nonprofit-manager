import type { Dispatch, SetStateAction } from 'react';
import { BrutalButton } from '../../../components/neo-brutalist';
import type {
  CaseFormLogicOperator,
  CaseFormLogicRule,
  CaseFormQuestionType,
  CaseFormSchema,
} from '../../../types/caseForms';
import {
  CASE_FORM_LOGIC_OPERATORS,
  CASE_MAPPING_TARGET_PRESETS,
  CONTACT_MAPPING_FIELDS,
  createLogicRule,
  formatLogicRulesText,
  formatOptionsText,
  getDefaultPlaceholderForQuestionType,
  getQuestionPlaceholderLabel,
  operatorNeedsValue,
  parseLogicRulesText,
  parseOptionsText,
  updateQuestionMappingTarget,
} from './caseFormsPanelUtils';
import { questionFieldId, ruleFieldId } from './caseFormBuilderIds';

type CaseFormSection = CaseFormSchema['sections'][number];
type CaseFormQuestion = CaseFormSection['questions'][number];

type UpdateSection = (
  sectionId: string,
  updater: (section: CaseFormSection) => CaseFormSection
) => void;

interface CaseFormsQuestionEditorProps {
  allQuestions: CaseFormQuestion[];
  logicDrafts: Record<string, string>;
  question: CaseFormQuestion;
  sectionId: string;
  sectionQuestionCount: number;
  setLogicDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  updateQuestionVisibleRules: (
    sectionId: string,
    questionId: string,
    rules: CaseFormLogicRule[]
  ) => void;
  updateSection: UpdateSection;
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

const formatMappingFieldLabel = (field: string): string =>
  field
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function CaseFormsQuestionEditor({
  allQuestions,
  logicDrafts,
  question,
  sectionId,
  sectionQuestionCount,
  setLogicDrafts,
  updateQuestionVisibleRules,
  updateSection,
}: CaseFormsQuestionEditorProps) {
  return (
    <div className="rounded border-2 border-black bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <label
            htmlFor={questionFieldId(question.id, 'label')}
            className="mb-1 block text-xs font-black uppercase text-black/70"
          >
            Question Label
          </label>
          <input
            id={questionFieldId(question.id, 'label')}
            value={question.label}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
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
          <label
            htmlFor={questionFieldId(question.id, 'key')}
            className="mb-1 block text-xs font-black uppercase text-black/70"
          >
            Question Key
          </label>
          <input
            id={questionFieldId(question.id, 'key')}
            value={question.key}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
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
          <label
            htmlFor={questionFieldId(question.id, 'type')}
            className="mb-1 block text-xs font-black uppercase text-black/70"
          >
            Type
          </label>
          <select
            id={questionFieldId(question.id, 'type')}
            value={question.type}
            onChange={(event) => {
              const nextType = event.target.value as CaseFormQuestionType;

              updateSection(sectionId, (current) => ({
                ...current,
                questions: current.questions.map((item) =>
                  item.id === question.id
                    ? {
                        ...item,
                        type: nextType,
                        placeholder:
                          nextType === 'checkbox' && !item.multiple && !item.placeholder
                            ? getDefaultPlaceholderForQuestionType(nextType, item.multiple)
                            : item.placeholder,
                        options: ['select', 'radio', 'checkbox'].includes(nextType)
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
          <label
            htmlFor={questionFieldId(question.id, 'placeholder')}
            className="mb-1 block text-xs font-black uppercase text-black/70"
          >
            {getQuestionPlaceholderLabel(question)}
          </label>
          <input
            id={questionFieldId(question.id, 'placeholder')}
            value={question.placeholder || ''}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
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
          <label
            htmlFor={questionFieldId(question.id, 'helper-text')}
            className="mb-1 block text-xs font-black uppercase text-black/70"
          >
            Helper Text
          </label>
          <textarea
            id={questionFieldId(question.id, 'helper-text')}
            value={question.helper_text || ''}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
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
            id={questionFieldId(question.id, 'required')}
            type="checkbox"
            checked={question.required === true}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
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
            id={questionFieldId(question.id, 'multiple')}
            type="checkbox"
            checked={question.multiple === true}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
                ...current,
                questions: current.questions.map((item) =>
                  item.id === question.id
                    ? {
                        ...item,
                        multiple: event.target.checked,
                        placeholder:
                          !event.target.checked && item.type === 'checkbox' && !item.placeholder
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
          <label
            htmlFor={questionFieldId(question.id, 'options')}
            className="mb-1 block text-xs font-black uppercase text-black/70"
          >
            Options (one per line, `Label|value`)
          </label>
          <textarea
            id={questionFieldId(question.id, 'options')}
            value={formatOptionsText(question.options)}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
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
            <label
              htmlFor={questionFieldId(question.id, 'upload-accept')}
              className="mb-1 block text-xs font-black uppercase text-black/70"
            >
              Accepted MIME Types
            </label>
            <input
              id={questionFieldId(question.id, 'upload-accept')}
              value={(question.upload_config?.accept || []).join(',')}
              onChange={(event) =>
                updateSection(sectionId, (current) => ({
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
            <label
              htmlFor={questionFieldId(question.id, 'upload-max-files')}
              className="mb-1 block text-xs font-black uppercase text-black/70"
            >
              Max Files
            </label>
            <input
              id={questionFieldId(question.id, 'upload-max-files')}
              type="number"
              min={1}
              max={20}
              value={question.upload_config?.max_files || 1}
              onChange={(event) =>
                updateSection(sectionId, (current) => ({
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
          <label
            htmlFor={questionFieldId(question.id, 'mapping-target')}
            className="mb-1 block text-xs font-black uppercase text-black/70"
          >
            Mapping Target
          </label>
          <select
            id={questionFieldId(question.id, 'mapping-target')}
            aria-label={`Mapping target for ${question.label}`}
            value={question.mapping_target?.entity ? question.mapping_target.entity : 'none'}
            onChange={(event) =>
              updateSection(sectionId, (current) => ({
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
            <label
              htmlFor={questionFieldId(question.id, 'contact-field')}
              className="mb-1 block text-xs font-black uppercase text-black/70"
            >
              Contact Field
            </label>
            <select
              id={questionFieldId(question.id, 'contact-field')}
              aria-label={`Contact field for ${question.label}`}
              value={question.mapping_target.field || ''}
              onChange={(event) =>
                updateSection(sectionId, (current) => ({
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
                  {formatMappingFieldLabel(field)}
                </option>
              ))}
            </select>
          </div>
        )}

        {question.mapping_target?.entity === 'case' && (
          <>
            <div>
              <label
                htmlFor={questionFieldId(question.id, 'case-container')}
                className="mb-1 block text-xs font-black uppercase text-black/70"
              >
                Case Container
              </label>
              <select
                id={questionFieldId(question.id, 'case-container')}
                aria-label={`Case container for ${question.label}`}
                value={question.mapping_target.container || 'intake_data'}
                onChange={(event) =>
                  updateSection(sectionId, (current) => ({
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
              <label
                htmlFor={questionFieldId(question.id, 'case-field')}
                className="mb-1 block text-xs font-black uppercase text-black/70"
              >
                Case Field
              </label>
              <select
                id={questionFieldId(question.id, 'case-field')}
                aria-label={`Case field for ${question.label}`}
                value={
                  CASE_MAPPING_TARGET_PRESETS.some(
                    (preset) =>
                      preset.container ===
                        (question.mapping_target?.container || 'intake_data') &&
                      preset.key === question.mapping_target?.key
                  )
                    ? `${question.mapping_target.container || 'intake_data'}:${
                        question.mapping_target.key || ''
                      }`
                    : question.mapping_target.key
                      ? '__custom__'
                      : ''
                }
                onChange={(event) =>
                  updateSection(sectionId, (current) => ({
                    ...current,
                    questions: current.questions.map((item) => {
                      if (item.id !== question.id) return item;
                      const preset = CASE_MAPPING_TARGET_PRESETS.find(
                        (target) => `${target.container}:${target.key}` === event.target.value
                      );
                      return {
                        ...item,
                        mapping_target: updateQuestionMappingTarget(item.mapping_target, {
                          entity: 'case',
                          container:
                            preset?.container || item.mapping_target?.container || 'intake_data',
                          key: preset?.key || '',
                        }),
                      };
                    }),
                  }))
                }
                className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
              >
                <option value="">Choose a case field</option>
                {CASE_MAPPING_TARGET_PRESETS.map((preset) => (
                  <option
                    key={`${preset.container}:${preset.key}`}
                    value={`${preset.container}:${preset.key}`}
                  >
                    {preset.label}
                  </option>
                ))}
                <option value="__custom__">Custom case key</option>
              </select>
              {!CASE_MAPPING_TARGET_PRESETS.some(
                (preset) =>
                  preset.container === (question.mapping_target?.container || 'intake_data') &&
                  preset.key === question.mapping_target?.key
              ) && (
                <div className="mt-2">
                  <label
                    htmlFor={questionFieldId(question.id, 'custom-case-key')}
                    className="mb-1 block text-xs font-black uppercase text-black/70"
                  >
                    Custom Case Key
                  </label>
                  <input
                    id={questionFieldId(question.id, 'custom-case-key')}
                    value={question.mapping_target.key || ''}
                    onChange={(event) =>
                      updateSection(sectionId, (current) => ({
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
                    placeholder="custom_case_key"
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 rounded border-2 border-black bg-app-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h5 className="text-xs font-black uppercase text-black/70">
              Conditional Visibility
            </h5>
          </div>
          <BrutalButton
            size="sm"
            variant="secondary"
            aria-label={`Add visibility rule for ${question.label}`}
            onClick={() => {
              const referenceKey =
                allQuestions.find((item) => item.id !== question.id && item.key.trim().length > 0)
                  ?.key || '';
              updateQuestionVisibleRules(sectionId, question.id, [
                ...(question.visible_when || []),
                createLogicRule(referenceKey),
              ]);
            }}
            disabled={!allQuestions.some((item) => item.id !== question.id && item.key.trim())}
          >
            + Rule
          </BrutalButton>
        </div>

        {question.visible_when?.length ? (
          <div className="mt-3 space-y-3">
            {question.visible_when.map((rule, ruleIndex) => {
              const selectedOperator = rule.operator as CaseFormLogicOperator;
              const needsValue = operatorNeedsValue(selectedOperator);
              return (
                <div
                  key={`${question.id}-rule-${ruleIndex}`}
                  className="grid gap-2 rounded border-2 border-black bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <label
                    htmlFor={ruleFieldId(question.id, ruleIndex, 'question')}
                    className="sr-only"
                  >
                    Condition question for {question.label}
                  </label>
                  <select
                    id={ruleFieldId(question.id, ruleIndex, 'question')}
                    aria-label={`Condition question for ${question.label}`}
                    value={rule.question_key}
                    onChange={(event) => {
                      const nextRules = [...(question.visible_when || [])];
                      nextRules[ruleIndex] = {
                        ...rule,
                        question_key: event.target.value,
                      };
                      updateQuestionVisibleRules(sectionId, question.id, nextRules);
                    }}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  >
                    <option value="">Choose question</option>
                    {allQuestions
                      .filter((item) => item.id !== question.id && item.key.trim())
                      .map((item) => (
                        <option key={item.id} value={item.key}>
                          {item.label || item.key}
                        </option>
                      ))}
                  </select>
                  <label
                    htmlFor={ruleFieldId(question.id, ruleIndex, 'operator')}
                    className="sr-only"
                  >
                    Condition operator for {question.label}
                  </label>
                  <select
                    id={ruleFieldId(question.id, ruleIndex, 'operator')}
                    aria-label={`Condition operator for ${question.label}`}
                    value={rule.operator}
                    onChange={(event) => {
                      const operator = event.target.value as CaseFormLogicOperator;
                      const nextRules = [...(question.visible_when || [])];
                      nextRules[ruleIndex] = {
                        question_key: rule.question_key,
                        operator,
                        ...(operatorNeedsValue(operator) ? { value: rule.value ?? '' } : {}),
                      };
                      updateQuestionVisibleRules(sectionId, question.id, nextRules);
                    }}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm"
                  >
                    {CASE_FORM_LOGIC_OPERATORS.map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor={ruleFieldId(question.id, ruleIndex, 'value')}
                    className="sr-only"
                  >
                    Condition value for {question.label}
                  </label>
                  <input
                    id={ruleFieldId(question.id, ruleIndex, 'value')}
                    aria-label={`Condition value for ${question.label}`}
                    value={needsValue ? String(rule.value ?? '') : ''}
                    disabled={!needsValue}
                    onChange={(event) => {
                      const nextRules = [...(question.visible_when || [])];
                      nextRules[ruleIndex] = {
                        ...rule,
                        value: event.target.value,
                      };
                      updateQuestionVisibleRules(sectionId, question.id, nextRules);
                    }}
                    placeholder={needsValue ? 'Value' : 'No value needed'}
                    className="w-full border-2 border-black bg-app-surface px-3 py-2 text-sm disabled:bg-black/10"
                  />
                  <BrutalButton
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      updateQuestionVisibleRules(
                        sectionId,
                        question.id,
                        (question.visible_when || []).filter((_, index) => index !== ruleIndex)
                      )
                    }
                  >
                    Remove
                  </BrutalButton>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs font-bold text-black/70">Always visible.</p>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-black uppercase text-black/70">
            Advanced JSON
          </summary>
          <label htmlFor={questionFieldId(question.id, 'logic-json')} className="sr-only">
            Visibility rules JSON for {question.label}
          </label>
          <textarea
            id={questionFieldId(question.id, 'logic-json')}
            value={logicDrafts[question.id] ?? formatLogicRulesText(question)}
            onChange={(event) =>
              setLogicDrafts((current) => ({
                ...current,
                [question.id]: event.target.value,
              }))
            }
            onBlur={() =>
              updateSection(sectionId, (current) => ({
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
            className="mt-2 w-full border-2 border-black bg-white px-3 py-2 font-mono text-xs"
          />
        </details>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <BrutalButton
          size="sm"
          variant="danger"
          aria-label={`Remove question ${question.label}`}
          onClick={() =>
            updateSection(sectionId, (current) => ({
              ...current,
              questions: current.questions.filter((item) => item.id !== question.id),
            }))
          }
          disabled={sectionQuestionCount === 1}
        >
          Remove Question
        </BrutalButton>
      </div>
    </div>
  );
}
