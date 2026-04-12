import { describe, expect, it } from 'vitest';
import { resolveSafeNavigationTarget } from '../safeUrl';

describe('resolveSafeNavigationTarget', () => {
  it('rejects executable and protocol-relative navigation targets', () => {
    expect(resolveSafeNavigationTarget('javascript:alert(1)')).toBeNull();
    expect(resolveSafeNavigationTarget('data:text/html,<svg onload=alert(1)>')).toBeNull();
    expect(resolveSafeNavigationTarget('vbscript:msgbox(1)')).toBeNull();
    expect(resolveSafeNavigationTarget('//example.com')).toBeNull();
  });

  it('accepts safe http(s) and relative navigation targets', () => {
    expect(resolveSafeNavigationTarget('https://example.com/path')).toBe('https://example.com/path');
    expect(resolveSafeNavigationTarget('/donations')).toBe('/donations');
    expect(resolveSafeNavigationTarget('../contacts/new')).toBe('../contacts/new');
  });
});
