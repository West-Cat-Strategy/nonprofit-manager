import type {
  CaseFormAsset,
  CaseFormLogicRule,
  CaseFormQuestion,
  CaseFormSchema,
} from '../../../types/caseForms';

const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
};

export const isCaseFormValueEmpty = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const extractCaseFormAssetIds = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractCaseFormAssetIds(item));
  }
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return [String((value as { id: string }).id)];
  }
  return [];
};

const ruleMatches = (rule: CaseFormLogicRule, answers: Record<string, unknown>): boolean => {
  const current = answers[rule.question_key];
  switch (rule.operator) {
    case 'equals':
      return stableSerialize(current) === stableSerialize(rule.value);
    case 'not_equals':
      return stableSerialize(current) !== stableSerialize(rule.value);
    case 'contains':
      if (Array.isArray(current)) {
        return current.some((item) => stableSerialize(item) === stableSerialize(rule.value));
      }
      if (typeof current === 'string') {
        return current.toLowerCase().includes(String(rule.value ?? '').toLowerCase());
      }
      return false;
    case 'not_contains':
      return !ruleMatches({ ...rule, operator: 'contains' }, answers);
    case 'answered':
      return !isCaseFormValueEmpty(current);
    case 'not_answered':
      return isCaseFormValueEmpty(current);
    case 'truthy':
      return Boolean(current);
    case 'falsy':
      return !current;
    default:
      return false;
  }
};

export const isCaseFormQuestionVisible = (
  question: CaseFormQuestion,
  answers: Record<string, unknown>
): boolean => {
  if (!question.visible_when?.length) {
    return true;
  }

  return question.visible_when.every((rule) => ruleMatches(rule, answers));
};

export const buildCaseFormAssetLookup = (assets: CaseFormAsset[]): Map<string, CaseFormAsset> =>
  new Map(assets.map((asset) => [asset.id, asset]));

export const listVisibleCaseFormQuestions = (
  schema: CaseFormSchema,
  answers: Record<string, unknown>
): Array<{ sectionId: string; sectionTitle: string; question: CaseFormQuestion }> => {
  return schema.sections.flatMap((section) =>
    section.questions
      .filter((question) => isCaseFormQuestionVisible(question, answers))
      .map((question) => ({
        sectionId: section.id,
        sectionTitle: section.title,
        question,
      }))
  );
};
