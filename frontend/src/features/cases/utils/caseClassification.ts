import type { CaseOutcome } from '../../../types/case';

export const CASE_OUTCOME_OPTIONS: Array<{ value: CaseOutcome; label: string }> = [
  { value: 'successful', label: 'Successful' },
  { value: 'unsuccessful', label: 'Unsuccessful' },
  { value: 'referred', label: 'Referred' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'attended_event', label: 'Attended Event' },
  { value: 'additional_related_case', label: 'Additional/Related Case Opened' },
  { value: 'other', label: 'Other' },
];

const CASE_OUTCOME_LABELS: Record<CaseOutcome, string> = CASE_OUTCOME_OPTIONS.reduce(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {} as Record<CaseOutcome, string>
);

export const formatCaseOutcomeLabel = (value?: string | null): string => {
  if (!value) {
    return 'Outcome';
  }

  const normalized = CASE_OUTCOME_LABELS[value as CaseOutcome];
  if (normalized) {
    return normalized;
  }

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const summarizeLabels = (labels: Array<string | null | undefined>, maxVisible = 2): {
  visible: string[];
  hiddenCount: number;
} => {
  const compact = labels.filter((label): label is string => typeof label === 'string' && label.trim().length > 0);
  return {
    visible: compact.slice(0, maxVisible),
    hiddenCount: Math.max(0, compact.length - maxVisible),
  };
};
