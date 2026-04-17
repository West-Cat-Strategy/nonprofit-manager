import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { CaseFormAsset, CaseFormQuestion, CaseFormSchema } from '../../../types/caseForms';
import {
  buildCaseFormAssetLookup,
  extractCaseFormAssetIds,
  isCaseFormQuestionVisible,
} from './caseFormUtils';

interface CaseFormRendererProps {
  schema: CaseFormSchema;
  answers: Record<string, unknown>;
  assets?: CaseFormAsset[];
  disabled?: boolean;
  readOnly?: boolean;
  variant?: 'staff' | 'portal' | 'public';
  onAnswerChange: (questionKey: string, value: unknown) => void;
  onUploadAsset?: (question: CaseFormQuestion, file: File) => Promise<CaseFormAsset>;
}

const panelToneByVariant: Record<NonNullable<CaseFormRendererProps['variant']>, string> = {
  staff: 'border-black bg-white',
  portal: 'border-app-border bg-app-panel',
  public: 'border-app-border bg-white/90',
};

const labelToneByVariant: Record<NonNullable<CaseFormRendererProps['variant']>, string> = {
  staff: 'text-black/70',
  portal: 'text-app-text-muted',
  public: 'text-app-text-muted',
};

const inputToneByVariant: Record<NonNullable<CaseFormRendererProps['variant']>, string> = {
  staff: 'border-black bg-app-surface text-black',
  portal: 'border-app-input-border bg-app-surface text-app-text',
  public: 'border-app-input-border bg-white text-app-text',
};

const resolveInputType = (question: CaseFormQuestion): string => {
  if (question.type === 'email') return 'email';
  if (question.type === 'phone') return 'tel';
  if (question.type === 'number') return 'number';
  if (question.type === 'date') return 'date';
  return 'text';
};

const optionArrayFromValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [];
};

const sanitizeIdSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildQuestionControlId = (sectionId: string, questionId: string): string =>
  `case-form-${sanitizeIdSegment(sectionId)}-${sanitizeIdSegment(questionId)}`;

export default function CaseFormRenderer({
  schema,
  answers,
  assets = [],
  disabled = false,
  readOnly = false,
  variant = 'staff',
  onAnswerChange,
  onUploadAsset,
}: CaseFormRendererProps) {
  const assetLookup = buildCaseFormAssetLookup(assets);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const basePanelClass = panelToneByVariant[variant];
  const labelClass = labelToneByVariant[variant];
  const inputClass = inputToneByVariant[variant];

  const handleAssetSelection = async (
    question: CaseFormQuestion,
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    if (!onUploadAsset || !event.target.files?.length) {
      return;
    }

    const files = Array.from(event.target.files);
    setUploadingKey(question.key);
    try {
      const uploaded = await Promise.all(files.map((file) => onUploadAsset(question, file)));
      const nextIds = uploaded.map((asset) => asset.id);
      if ((question.upload_config?.max_files ?? 1) > 1 || question.multiple) {
        const currentIds = extractCaseFormAssetIds(answers[question.key]);
        onAnswerChange(question.key, Array.from(new Set([...currentIds, ...nextIds])));
      } else {
        onAnswerChange(question.key, nextIds[0] || null);
      }
    } finally {
      setUploadingKey(null);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {schema.sections.map((section) => (
        <section key={section.id} className={`rounded border-2 p-4 ${basePanelClass}`}>
          <div className="mb-4">
            <h3 className="text-base font-black uppercase">{section.title}</h3>
            {section.description && (
              <p className="mt-1 text-sm opacity-80">{section.description}</p>
            )}
          </div>

          <div className="space-y-4">
            {section.questions
              .filter((question) => isCaseFormQuestionVisible(question, answers))
              .map((question) => {
                const value = answers[question.key];
                const assetIds = extractCaseFormAssetIds(value);
                const uploadedAssets = assetIds
                  .map((assetId) => assetLookup.get(assetId))
                  .filter(Boolean) as CaseFormAsset[];
                const questionControlId = buildQuestionControlId(section.id, question.id);
                const questionLabelId = `${questionControlId}-label`;
                const helperTextId = question.helper_text
                  ? `${questionControlId}-helper`
                  : undefined;
                const isGroupedControl = question.type === 'radio' || question.type === 'checkbox';

                return (
                  <div key={question.id} className="space-y-2">
                    {isGroupedControl ? (
                      <fieldset className="space-y-2">
                        <legend
                          id={questionLabelId}
                          className={`block text-xs font-black uppercase ${labelClass}`}
                        >
                          {question.label}
                          {question.required ? ' *' : ''}
                        </legend>
                        {question.helper_text && (
                          <p id={helperTextId} className="text-xs opacity-70">
                            {question.helper_text}
                          </p>
                        )}

                        {question.type === 'radio' && (
                          <div className="space-y-2" aria-describedby={helperTextId}>
                            {(question.options || []).map((option) => {
                              const optionId = `${questionControlId}-${sanitizeIdSegment(option.value)}`;

                              return (
                                <label
                                  key={option.value}
                                  htmlFor={optionId}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <input
                                    id={optionId}
                                    type="radio"
                                    name={question.key}
                                    value={option.value}
                                    disabled={disabled || readOnly}
                                    checked={value === option.value}
                                    onChange={() => onAnswerChange(question.key, option.value)}
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {question.type === 'checkbox' &&
                          !question.multiple &&
                          (() => {
                            const optionLabelId = `${questionControlId}-option-label`;

                            return (
                              <label
                                htmlFor={questionControlId}
                                className="flex items-center gap-2 text-sm"
                              >
                                <input
                                  id={questionControlId}
                                  type="checkbox"
                                  disabled={disabled || readOnly}
                                  checked={value === true}
                                  aria-describedby={helperTextId}
                                  aria-labelledby={`${questionLabelId} ${optionLabelId}`}
                                  onChange={(event) =>
                                    onAnswerChange(question.key, event.target.checked)
                                  }
                                />
                                <span id={optionLabelId}>{question.placeholder || 'Checked'}</span>
                              </label>
                            );
                          })()}

                        {question.type === 'checkbox' && question.multiple && (
                          <div className="space-y-2" aria-describedby={helperTextId}>
                            {(question.options || []).map((option) => {
                              const selected = optionArrayFromValue(value);
                              const isChecked = selected.includes(option.value);
                              const optionId = `${questionControlId}-${sanitizeIdSegment(option.value)}`;

                              return (
                                <label
                                  key={option.value}
                                  htmlFor={optionId}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <input
                                    id={optionId}
                                    type="checkbox"
                                    disabled={disabled || readOnly}
                                    checked={isChecked}
                                    onChange={(event) =>
                                      onAnswerChange(
                                        question.key,
                                        event.target.checked
                                          ? [...selected, option.value]
                                          : selected.filter((item) => item !== option.value)
                                      )
                                    }
                                  />
                                  <span>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </fieldset>
                    ) : (
                      <>
                        <label
                          id={questionLabelId}
                          htmlFor={questionControlId}
                          className={`block text-xs font-black uppercase ${labelClass}`}
                        >
                          {question.label}
                          {question.required ? ' *' : ''}
                        </label>
                        {question.helper_text && (
                          <p id={helperTextId} className="text-xs opacity-70">
                            {question.helper_text}
                          </p>
                        )}

                        {(question.type === 'text' ||
                          question.type === 'email' ||
                          question.type === 'phone' ||
                          question.type === 'number' ||
                          question.type === 'date') && (
                          <input
                            id={questionControlId}
                            type={resolveInputType(question)}
                            value={
                              typeof value === 'string' || typeof value === 'number'
                                ? String(value)
                                : ''
                            }
                            placeholder={question.placeholder || ''}
                            disabled={disabled || readOnly}
                            aria-describedby={helperTextId}
                            onChange={(event) =>
                              onAnswerChange(
                                question.key,
                                question.type === 'number'
                                  ? event.target.value === ''
                                    ? ''
                                    : Number(event.target.value)
                                  : event.target.value
                              )
                            }
                            className={`w-full rounded border px-3 py-2 text-sm ${inputClass}`}
                          />
                        )}

                        {question.type === 'textarea' && (
                          <textarea
                            id={questionControlId}
                            value={typeof value === 'string' ? value : ''}
                            placeholder={question.placeholder || ''}
                            disabled={disabled || readOnly}
                            aria-describedby={helperTextId}
                            onChange={(event) => onAnswerChange(question.key, event.target.value)}
                            rows={4}
                            className={`w-full rounded border px-3 py-2 text-sm ${inputClass}`}
                          />
                        )}

                        {question.type === 'select' && !question.multiple && (
                          <select
                            id={questionControlId}
                            value={typeof value === 'string' ? value : ''}
                            disabled={disabled || readOnly}
                            aria-describedby={helperTextId}
                            onChange={(event) => onAnswerChange(question.key, event.target.value)}
                            className={`w-full rounded border px-3 py-2 text-sm ${inputClass}`}
                          >
                            <option value="">Select an option</option>
                            {(question.options || []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {question.type === 'select' && question.multiple && (
                          <select
                            id={questionControlId}
                            value={optionArrayFromValue(value)}
                            disabled={disabled || readOnly}
                            aria-describedby={helperTextId}
                            multiple
                            onChange={(event) =>
                              onAnswerChange(
                                question.key,
                                Array.from(event.target.selectedOptions).map(
                                  (option) => option.value
                                )
                              )
                            }
                            className={`w-full rounded border px-3 py-2 text-sm ${inputClass}`}
                          >
                            {(question.options || []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {(question.type === 'file' || question.type === 'signature') && (
                          <div className="space-y-2">
                            {!readOnly && (
                              <input
                                id={questionControlId}
                                type="file"
                                disabled={disabled || uploadingKey === question.key}
                                multiple={
                                  (question.upload_config?.max_files ?? 1) > 1 || question.multiple
                                }
                                accept={question.upload_config?.accept?.join(',') || undefined}
                                aria-describedby={helperTextId}
                                onChange={(event) => {
                                  void handleAssetSelection(question, event);
                                }}
                                className="block w-full text-sm"
                              />
                            )}
                            {uploadingKey === question.key && (
                              <p className="text-xs font-semibold uppercase opacity-70">
                                Uploading…
                              </p>
                            )}
                            {uploadedAssets.length > 0 && (
                              <ul className="space-y-1">
                                {uploadedAssets.map((asset) => (
                                  <li
                                    key={asset.id}
                                    className="flex items-center justify-between gap-3 text-sm"
                                  >
                                    <span className="truncate">{asset.original_name}</span>
                                    {asset.download_url && (
                                      <a
                                        href={asset.download_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold uppercase underline"
                                      >
                                        Open
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {assetIds.length > 0 && uploadedAssets.length === 0 && (
                              <p className="text-xs opacity-70">
                                {assetIds.length} uploaded item{assetIds.length === 1 ? '' : 's'}{' '}
                                attached.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
