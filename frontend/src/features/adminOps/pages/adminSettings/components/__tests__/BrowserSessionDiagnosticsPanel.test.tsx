import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearBrowserSessionDiagnostics,
  getBrowserSessionDiagnostics,
  recordBrowserSessionDiagnostic,
} from '../../../../../../services/browserSessionDiagnostics';
import BrowserSessionDiagnosticsPanel from '../BrowserSessionDiagnosticsPanel';

describe('BrowserSessionDiagnosticsPanel', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearBrowserSessionDiagnostics();
    window.history.pushState({}, '', '/settings/admin/audit_logs');
  });

  it('shows bootstrap and route diagnostics captured in the current browser tab', () => {
    recordBrowserSessionDiagnostic({
      area: 'bootstrap',
      event: 'staff_bootstrap_failed',
      severity: 'warning',
      message: 'Staff bootstrap request failed.',
      path: '/settings/admin/dashboard',
    });
    recordBrowserSessionDiagnostic({
      area: 'route',
      event: 'route_render_failed',
      severity: 'error',
      message: 'Website console failed to render.',
      path: '/websites/site-1/forms',
    });

    render(<BrowserSessionDiagnosticsPanel />);

    expect(screen.getByRole('heading', { name: /current tab diagnostics/i })).toBeInTheDocument();
    expect(screen.getByText('Staff bootstrap request failed.')).toBeInTheDocument();
    expect(screen.getByText('Website console failed to render.')).toBeInTheDocument();
    expect(screen.getByText(/staff_bootstrap_failed at \/settings\/admin\/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/route_render_failed at \/websites\/site-1\/forms/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('copies and clears diagnostics without touching a backend service', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    recordBrowserSessionDiagnostic({
      area: 'route',
      event: 'route_render_failed',
      severity: 'error',
      message: 'Route failed.',
    });

    render(<BrowserSessionDiagnosticsPanel />);

    await user.click(screen.getByRole('button', { name: /copy diagnostics/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('route_render_failed'));
    expect(screen.getByRole('status')).toHaveTextContent('Diagnostics copied.');

    await user.click(screen.getByRole('button', { name: /clear diagnostics/i }));

    expect(getBrowserSessionDiagnostics()).toEqual([]);
    expect(screen.getByText(/no browser-session diagnostics captured/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Diagnostics cleared.');
    expect(screen.getByRole('button', { name: /copy diagnostics/i })).toBeDisabled();
  });
});
