export const shouldBypassMfaForTests = (
  env: NodeJS.ProcessEnv = process.env
): boolean => env.NODE_ENV === 'test' && env.BYPASS_MFA_FOR_TESTS === 'true';
