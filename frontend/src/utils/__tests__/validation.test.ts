import { describe, expect, it } from 'vitest';
import { isStrongPassword, sanitizeBuilderUrl, validatePassword, validateUrl } from '../validation';

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

describe('url validation utility', () => {
  it('rejects executable schemes and preserves safe builder URLs', () => {
    expect(sanitizeBuilderUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeBuilderUrl('data:text/html,<svg onload=alert(1)>')).toBe('');
    expect(sanitizeBuilderUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(sanitizeBuilderUrl('/about-us')).toBe('/about-us');
  });

  it('accepts standard http and https URLs while rejecting script-bearing schemes', () => {
    expect(validateUrl('https://example.com')).toBeNull();
    expect(validateUrl('example.com')).toBeNull();
    expect(validateUrl('javascript:alert(1)')).toBe('Please enter a valid URL');
    expect(validateUrl('data:text/html,<svg></svg>')).toBe('Please enter a valid URL');
  });
});
