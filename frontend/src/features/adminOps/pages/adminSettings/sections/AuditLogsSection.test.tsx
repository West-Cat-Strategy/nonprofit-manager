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
