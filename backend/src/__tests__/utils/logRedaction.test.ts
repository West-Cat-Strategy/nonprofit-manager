import { redactUrlForLogs } from '@utils/logRedaction';

describe('redactUrlForLogs', () => {
  it('redacts sensitive query parameters while preserving route shape', () => {
    expect(
      redactUrlForLogs(
        '/api/v2/public/newsletters/confirm?token=raw-token&email=user%40example.org&page=2'
      )
    ).toBe(
      '/api/v2/public/newsletters/confirm?token=%5BREDACTED%5D&email=user%40example.org&page=2'
    );
  });

  it('redacts token-like path segments after sensitive route markers', () => {
    expect(redactUrlForLogs('/portal/reset-password/raw-reset-token-1234567890abcdef')).toBe(
      '/portal/reset-password/[REDACTED]'
    );
  });

  it('redacts fragment credentials when OAuth-style values are present', () => {
    expect(redactUrlForLogs('/auth/callback#access_token=secret-token&state=keep')).toBe(
      '/auth/callback#access_token=%5BREDACTED%5D&state=keep'
    );
  });
});
