import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearBrowserSessionDiagnostics,
  formatBrowserSessionDiagnostics,
  getBrowserSessionDiagnostics,
  recordBrowserSessionDiagnostic,
} from '../browserSessionDiagnostics';

describe('browserSessionDiagnostics redaction', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearBrowserSessionDiagnostics();
  });

  it('redacts sensitive route values before storage', () => {
    recordBrowserSessionDiagnostic({
      area: 'route',
      event: 'route_render_failed',
      severity: 'error',
      message: 'Route failed.',
      path: '/portal/reset-password/raw-reset-token-1234567890abcdef?token=secret-token&page=2',
      details: {
        callbackUrl: '/auth/callback?code=oauth-code&state=visible',
        apiKey: 'raw-api-key',
      },
    });

    const [event] = getBrowserSessionDiagnostics();

    expect(event?.path).toBe(
      '/portal/reset-password/[REDACTED]?token=%5BREDACTED%5D&page=2'
    );
    expect(event?.details).toMatchObject({
      callbackUrl: '/auth/callback?code=%5BREDACTED%5D&state=visible',
      apiKey: '[REDACTED]',
    });
  });

  it('redacts sensitive route values again before copy formatting', () => {
    window.sessionStorage.setItem(
      'operator_browser_session_diagnostics',
      JSON.stringify([
        {
          id: 'diagnostic-1',
          area: 'route',
          event: 'route_render_failed',
          severity: 'error',
          message: 'Route failed.',
          path: '/newsletter/confirm?token=raw-token',
          createdAt: '2026-05-05T00:00:00.000Z',
        },
      ])
    );

    expect(formatBrowserSessionDiagnostics()).toContain(
      '"/newsletter/confirm?token=%5BREDACTED%5D"'
    );
  });

  it('redacts bare token-like hash fragments', () => {
    recordBrowserSessionDiagnostic({
      area: 'route',
      event: 'route_render_failed',
      severity: 'error',
      message: 'Route failed.',
      path: '/portal/reset-password#eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    });

    const [event] = getBrowserSessionDiagnostics();
    expect(event?.path).toBe('/portal/reset-password#[REDACTED]');
  });
});
