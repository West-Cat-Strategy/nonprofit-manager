import pool from '@config/database';
import { getDashboardWorkqueueSummary } from '../workqueueSummaryService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

describe('workqueueSummaryService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('omits queues when the current role lacks the required permissions', async () => {
    const cards = await getDashboardWorkqueueSummary({
      userId: 'user-1',
      role: 'volunteer',
      organizationId: 'account-1',
    });

    expect(cards).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns only portal escalation summaries for case-view users without portal-admin access', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] }).mockResolvedValueOnce({
      rows: [
        {
          id: 'escalation-1',
          case_id: 'case-1',
          case_number: 'CASE-1',
          case_title: 'Housing Support',
          severity: 'urgent',
          status: 'open',
          sla_due_at: new Date('2026-05-03T10:00:00Z'),
        },
      ],
    });

    const cards = await getDashboardWorkqueueSummary({
      userId: 'user-1',
      role: 'staff',
      organizationId: 'account-1',
    });

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'portal_escalations',
      count: 2,
      permissionScope: ['case:view'],
      primaryAction: {
        href: '/cases/case-1?tab=portal',
      },
      rows: [
        {
          id: 'escalation-1',
          href: '/cases/case-1?tab=portal',
        },
      ],
    });
    expect(mockQuery.mock.calls[0][0]).toContain("pe.status IN ('open', 'in_review')");
    expect(mockQuery.mock.calls[0][0]).toContain(
      '(pe.assignee_user_id IS NULL OR pe.assignee_user_id = $1)'
    );
    expect(mockQuery.mock.calls[0][0]).toContain('(c.account_id = $2 OR pe.account_id = $2)');
    expect(mockQuery.mock.calls[0][1]).toEqual(['user-1', 'account-1']);
  });

  it('fails portal escalation summaries closed when organization context is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

    const cards = await getDashboardWorkqueueSummary({
      userId: 'admin-1',
      role: 'admin',
      organizationId: null,
    });

    expect(cards).toEqual([
      expect.objectContaining({
        id: 'intake_resolution',
        count: 1,
        permissionScope: ['admin:users'],
        primaryAction: {
          label: 'Resolve portal signups',
          href: '/settings/admin/portal/access',
        },
      }),
      expect.objectContaining({
        id: 'portal_escalations',
        count: 0,
        permissionScope: ['case:view'],
        primaryAction: {
          label: 'Open cases',
          href: '/cases',
        },
        rows: [],
      }),
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('portal_signup_requests');
    expect(mockQuery.mock.calls[0][0]).toContain("resolution_status = 'needs_contact_resolution'");
    expect(mockQuery.mock.calls[0][0]).toContain('$1::uuid IS NOT NULL');
    expect(mockQuery.mock.calls[0][0]).toContain('psr.account_id = $1');
    expect(mockQuery.mock.calls[0][0]).toContain('scope_contact.account_id = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual([null]);
  });

  it('scopes intake resolution counts to the current organization context', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: 3 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const cards = await getDashboardWorkqueueSummary({
      userId: 'admin-1',
      role: 'admin',
      organizationId: 'account-2',
    });

    expect(cards).toEqual([
      expect.objectContaining({
        id: 'intake_resolution',
        count: 3,
      }),
      expect.objectContaining({
        id: 'portal_escalations',
        count: 0,
      }),
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('psr.account_id = $1'),
      ['account-2']
    );
  });
});
