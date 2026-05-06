import { shouldBypassMfaForTests } from '../mfaBypass';

describe('shouldBypassMfaForTests', () => {
  it('allows MFA bypass only for explicit test environment opt-in', () => {
    expect(
      shouldBypassMfaForTests({
        NODE_ENV: 'test',
        BYPASS_MFA_FOR_TESTS: 'true',
      })
    ).toBe(true);
  });

  it('does not allow MFA bypass outside test environment', () => {
    expect(
      shouldBypassMfaForTests({
        NODE_ENV: 'production',
        BYPASS_MFA_FOR_TESTS: 'true',
      })
    ).toBe(false);
  });

  it('does not allow MFA bypass in tests without explicit opt-in', () => {
    expect(
      shouldBypassMfaForTests({
        NODE_ENV: 'test',
        BYPASS_MFA_FOR_TESTS: 'false',
      })
    ).toBe(false);
  });
});
