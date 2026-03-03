import { describe, expect, it } from 'vitest';
import { isStrongPassword, validatePassword } from '../validation';

describe('password validation utility', () => {
  it('accepts passwords without special characters', () => {
    expect(validatePassword('Strong1Password')).toBeNull();
    expect(isStrongPassword('Strong1Password')).toBe(true);
  });

  it('accepts passwords with non-whitelisted special characters', () => {
    expect(validatePassword('Strong1#Password')).toBeNull();
    expect(validatePassword('Valid9_^word')).toBeNull();
  });

  it('rejects passwords missing core complexity requirements', () => {
    expect(validatePassword('nouppercase123')).toBe('Password must contain an uppercase letter');
    expect(validatePassword('NOLOWERCASE123')).toBe('Password must contain a lowercase letter');
    expect(validatePassword('NoNumbersHere')).toBe('Password must contain a number');
    expect(validatePassword('Short1')).toBe('Password must be at least 8 characters');
  });
});
