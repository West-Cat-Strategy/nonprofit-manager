import { describe, expect, it } from 'vitest';
import {
  parseAllowedValue,
  parseAllowedValueOrEmpty,
  parsePositiveInteger,
  safeParseStoredObject,
} from '../persistedFilters';

describe('persistedFilters', () => {
  it('parses stored objects only when the payload is a plain object', () => {
    expect(safeParseStoredObject('{"page":2,"status":"active"}')).toEqual({
      page: 2,
      status: 'active',
    });
    expect(safeParseStoredObject('[1,2,3]')).toBeNull();
    expect(safeParseStoredObject('not-json')).toBeNull();
  });

  it('normalizes positive integers with fallbacks', () => {
    expect(parsePositiveInteger('3', 1)).toBe(3);
    expect(parsePositiveInteger('0', 5)).toBe(5);
    expect(parsePositiveInteger('-2', 5)).toBe(5);
    expect(parsePositiveInteger(undefined, 7)).toBe(7);
  });

  it('accepts only allowlisted values', () => {
    const allowed = ['asc', 'desc'] as const;
    expect(parseAllowedValue('asc', allowed)).toBe('asc');
    expect(parseAllowedValue('sideways', allowed)).toBeUndefined();
    expect(parseAllowedValueOrEmpty('desc', allowed)).toBe('desc');
    expect(parseAllowedValueOrEmpty('sideways', allowed)).toBe('');
  });
});
