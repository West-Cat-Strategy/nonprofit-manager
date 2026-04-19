import { describe, expect, it } from '@jest/globals';
import {
  enrollTotpSecret,
  generateTotpCodeForTest,
  normalizeTotpCode,
  verifyTotpCode,
} from '../totp';

describe('auth totp helper', () => {
  it('generates a base32 secret and otpauth URI', () => {
    const { secret, otpauthUrl } = enrollTotpSecret('person@example.com', 'Nonprofit Manager');

    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(otpauthUrl).toContain('otpauth://totp/');
    expect(otpauthUrl).toContain('issuer=Nonprofit%20Manager');
  });

  it('verifies generated tokens and ignores whitespace in user input', () => {
    const { secret } = enrollTotpSecret('person@example.com', 'Nonprofit Manager');
    const token = generateTotpCodeForTest(secret);
    const spacedToken = `${token.slice(0, 3)} ${token.slice(3)}`;

    expect(normalizeTotpCode(spacedToken)).toBe(token);
    expect(verifyTotpCode(secret, spacedToken)).toBe(true);
    expect(verifyTotpCode(secret, '000000')).toBe(false);
  });
});
