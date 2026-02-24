import { describe, expect, it } from 'vitest';
import {
  CASE_PRIORITY_OPTIONS,
  getCasePriorityBadgeColor,
  getCasePriorityLabel,
  isUrgentEquivalentPriority,
  normalizeCasePriorityForApi,
} from '../casePriority';

describe('casePriority utils', () => {
  it('includes critical in case priority options', () => {
    const values = CASE_PRIORITY_OPTIONS.map((option) => option.value);
    expect(values).toContain('critical');
  });

  it('normalizes critical priority to urgent for API payloads', () => {
    expect(normalizeCasePriorityForApi('critical')).toBe('urgent');
    expect(normalizeCasePriorityForApi('urgent')).toBe('urgent');
    expect(normalizeCasePriorityForApi('high')).toBe('high');
    expect(normalizeCasePriorityForApi(undefined)).toBeUndefined();
    expect(normalizeCasePriorityForApi(null)).toBeNull();
  });

  it('treats critical as urgent-equivalent', () => {
    expect(isUrgentEquivalentPriority('urgent')).toBe(true);
    expect(isUrgentEquivalentPriority('critical')).toBe(true);
    expect(isUrgentEquivalentPriority('high')).toBe(false);
    expect(isUrgentEquivalentPriority(undefined)).toBe(false);
  });

  it('maps critical to urgent-equivalent badge color and label', () => {
    expect(getCasePriorityBadgeColor('critical')).toBe('red');
    expect(getCasePriorityBadgeColor('urgent')).toBe('red');
    expect(getCasePriorityLabel('critical')).toBe('Critical');
  });
});
