import { describe, it, expect } from 'vitest';
import { parseApiError, formatApiErrorMessage, formatApiErrorMessageWith } from '../apiError';

const makeAxiosError = (overrides: object = {}) => ({
  response: {
    data: {
      error: 'Something went wrong',
      code: 'ERR_001',
      correlationId: 'corr-123',
      details: { field: 'email' },
      ...overrides,
    },
  },
});

describe('parseApiError', () => {
  it('extracts structured error from an Axios response', () => {
    const err = makeAxiosError();
    const parsed = parseApiError(err, 'Fallback');
    expect(parsed.message).toBe('Something went wrong');
    expect(parsed.code).toBe('ERR_001');
    expect(parsed.correlationId).toBe('corr-123');
    expect(parsed.details).toEqual({ field: 'email' });
  });

  it('uses fallback message when response has no error field', () => {
    const err = { response: { data: {} } };
    const parsed = parseApiError(err, 'Fallback message');
    expect(parsed.message).toBe('Fallback message');
    expect(parsed.code).toBeUndefined();
    expect(parsed.correlationId).toBeUndefined();
  });

  it('uses error.message for plain Error objects', () => {
    const err = new Error('Network failure');
    const parsed = parseApiError(err, 'Fallback');
    expect(parsed.message).toBe('Network failure');
  });

  it('uses fallback when error has no message or response', () => {
    const parsed = parseApiError(null, 'Default error');
    expect(parsed.message).toBe('Default error');
  });

  it('handles errors with no response at all', () => {
    const parsed = parseApiError({}, 'Fallback');
    expect(parsed.message).toBe('Fallback');
  });

  it('omits code and correlationId when not present', () => {
    const err = makeAxiosError({ code: undefined, correlationId: undefined });
    const parsed = parseApiError(err, 'Fallback');
    expect(parsed.code).toBeUndefined();
    expect(parsed.correlationId).toBeUndefined();
  });
});

describe('formatApiErrorMessage', () => {
  it('appends correlation ID when present', () => {
    const err = makeAxiosError({ error: 'Auth failed', correlationId: 'req-abc' });
    const msg = formatApiErrorMessage(err, 'Fallback');
    expect(msg).toBe('Auth failed (Ref: req-abc)');
  });

  it('returns plain message when no correlation ID', () => {
    const err = makeAxiosError({ error: 'Auth failed', correlationId: undefined });
    const msg = formatApiErrorMessage(err, 'Fallback');
    expect(msg).toBe('Auth failed');
  });

  it('uses fallback when no structured error', () => {
    const msg = formatApiErrorMessage(null, 'Something broke');
    expect(msg).toBe('Something broke');
  });
});

describe('formatApiErrorMessageWith', () => {
  it('returns a curried formatter', () => {
    const formatter = formatApiErrorMessageWith('Default fallback');
    const err = makeAxiosError({ error: 'Specific error', correlationId: undefined });
    expect(formatter(err)).toBe('Specific error');
  });

  it('curried function uses the bound fallback', () => {
    const formatter = formatApiErrorMessageWith('Bound fallback');
    expect(formatter(null)).toBe('Bound fallback');
  });
});
