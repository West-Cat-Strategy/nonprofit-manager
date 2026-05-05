import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../../../services/api';
import { renderWithProviders } from '../../../../../test/testUtils';
import type { AuditLog } from '../../../contracts';
import AuditLogsSection from './AuditLogsSection';

const { setFromErrorMock } = vi.hoisted(() => ({
  setFromErrorMock: vi.fn(),
}));

vi.mock('../../../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../../../../../hooks/useApiError', () => ({
  useApiError: () => ({
    setFromError: setFromErrorMock,
  }),
}));

const mockedApi = vi.mocked(api);

const flushAuditLogLoad = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const auditLog: AuditLog = {
  id: 'audit-1',
  tableName: 'contacts',
  recordId: 'contact-1',
  operation: 'UPDATE',
  oldValues: null,
  newValues: null,
  changedFields: ['email'],
  changedBy: 'user-1',
  changedByEmail: 'admin@example.org',
  changedAt: '2026-03-05T17:00:00.000Z',
  clientIpAddress: '192.0.2.10',
  userAgent: 'Vitest Browser',
  isSensitive: false,
  summary: 'Updated contact record',
  details: 'Changed email on contact-1',
};

describe('AuditLogsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockReset();
  });

  it('shows audit-log health context and refreshes the current page', async () => {
    const user = userEvent.setup();
    mockedApi.get
      .mockResolvedValueOnce({
        data: {
          logs: [auditLog],
          total: 42,
          warning: 'Retention window is limited',
        },
      })
      .mockResolvedValueOnce({
        data: {
          logs: [{ ...auditLog, id: 'audit-2', summary: 'Created donation' }],
          total: 43,
        },
      });

    renderWithProviders(<AuditLogsSection />);
    await flushAuditLogLoad();

    expect(screen.getByRole('heading', { name: /audit logs/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actor' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Event' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Target' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Details' })).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalled();
    expect(screen.getAllByText('Updated contact record').length).toBeGreaterThan(0);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/latest visible event/i)).toBeInTheDocument();
    expect(screen.getByText(/by admin@example.org/i)).toBeInTheDocument();
    expect(screen.getByText(/backend warning: retention window is limited/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /refresh logs/i }));
    await flushAuditLogLoad();

    expect(screen.getAllByText('Created donation').length).toBeGreaterThan(0);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/audit-logs?limit=20&offset=0');
  });

  it('keeps server pagination offsets while rendering the dense grid', async () => {
    const user = userEvent.setup();
    mockedApi.get
      .mockResolvedValueOnce({
        data: {
          logs: [auditLog],
          total: 41,
        },
      })
      .mockResolvedValueOnce({
        data: {
          logs: [{ ...auditLog, id: 'audit-2', summary: 'Deleted stale invitation' }],
          total: 41,
        },
      });

    renderWithProviders(<AuditLogsSection />);
    await flushAuditLogLoad();

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /next/i }));
    await flushAuditLogLoad();

    expect(mockedApi.get).toHaveBeenLastCalledWith('/admin/audit-logs?limit=20&offset=20');
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(screen.getAllByText('Deleted stale invitation').length).toBeGreaterThan(0);
  });

  it('wraps long user-agent and detail text inside dense table cells', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        logs: [
          {
            ...auditLog,
            userAgent:
              'Mozilla/5.0 AdminOpsVeryLongUserAgentTokenWithoutNaturalBreaks/2026.05.03 PortalAuditTableOverflowProbe',
            details:
              'Changed values with a deliberately-long-unbroken-token-for-table-overflow-regression-proof-portal-admin-audit-log-details',
          },
        ],
        total: 1,
      },
    });

    renderWithProviders(<AuditLogsSection />);
    await flushAuditLogLoad();

    expect(screen.getByTestId('audit-log-user-agent')).toHaveClass('break-words');
    expect(screen.getByTestId('audit-log-user-agent')).toHaveClass('max-w-56');
    expect(screen.getByTestId('audit-log-details')).toHaveClass('break-words');
    expect(screen.getByTestId('audit-log-details')).toHaveClass('whitespace-pre-wrap');
  });

  it('uses the warning response as the empty or disabled state', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        logs: [],
        total: 0,
        warning: 'Audit logging is disabled',
      },
    });

    renderWithProviders(<AuditLogsSection />);
    await flushAuditLogLoad();

    expect(screen.getByText(/audit logging is disabled or unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/backend warning: audit logging is disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/no visible events on this page/i)).toBeInTheDocument();
  });

  it('shows fetch failure state and retries through the refresh affordance', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockRejectedValueOnce(new Error('network offline')).mockResolvedValueOnce({
      data: {
        logs: [auditLog],
        total: 1,
      },
    });

    renderWithProviders(<AuditLogsSection />);
    await flushAuditLogLoad();

    expect(screen.getByText(/failed to load audit logs/i)).toBeInTheDocument();
    expect(setFromErrorMock).toHaveBeenCalledWith(expect.any(Error), 'Failed to load audit logs');

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await flushAuditLogLoad();

    expect(screen.getAllByText('Updated contact record').length).toBeGreaterThan(0);
    expect(mockedApi.get).toHaveBeenCalledTimes(2);
  });
});
