import pool from '@config/database';
import {
  createPortalEscalation,
  listPortalEscalationsForCase,
  updatePortalEscalationForCase,
} from '@services/portalEscalationService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const escalationRow = {
  id: 'escalation-1',
  case_id: 'case-1',
  account_id: 'account-1',
  contact_id: 'contact-1',
  portal_user_id: 'portal-user-1',
  created_by_portal_user_id: 'portal-user-1',
  category: 'case_review',
  reason: 'Please review',
  severity: 'normal',
  sensitivity: 'standard',
  assignee_user_id: 'staff-1',
  sla_due_at: null,
  status: 'open',
  resolution_summary: null,
  created_at: new Date('2026-04-25T00:00:00Z'),
  updated_at: new Date('2026-04-25T00:00:00Z'),
};

describe('portalEscalationService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('keeps staff created_by separate from portal actor attribution', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [escalationRow] });

    const escalation = await createPortalEscalation({
      caseId: 'case-1',
      accountId: 'account-1',
      contactId: 'contact-1',
      portalUserId: 'portal-user-1',
      createdByPortalUserId: 'portal-user-1',
      assigneeUserId: 'staff-1',
      reason: 'Please review',
      createdBy: null,
    });

    expect(escalation.accountId).toBe('account-1');
    expect(escalation.createdByPortalUserId).toBe('portal-user-1');
    expect(mockQuery.mock.calls[0][0]).toContain('created_by_portal_user_id');
    expect(mockQuery.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['portal-user-1', null])
    );
  });

  it('lists case-scoped escalations with actor and account fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [escalationRow] });

    const escalations = await listPortalEscalationsForCase('case-1', 'account-1');

    expect(escalations).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('JOIN cases c ON c.id = pe.case_id');
    expect(mockQuery.mock.calls[0][1]).toEqual(['case-1', 'account-1']);
    expect(escalations[0]).toEqual(
      expect.objectContaining({
        caseId: 'case-1',
        accountId: 'account-1',
        createdByPortalUserId: 'portal-user-1',
      })
    );
  });

  it('updates staff-owned triage fields without replacing portal actor attribution', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          ...escalationRow,
          status: 'resolved',
          resolution_summary: 'Handled by staff',
        },
      ],
    });

    const escalation = await updatePortalEscalationForCase({
      id: 'escalation-1',
      caseId: 'case-1',
      accountId: 'account-1',
      status: 'resolved',
      resolutionSummary: 'Handled by staff',
      updatedBy: 'staff-2',
    });

    expect(escalation.status).toBe('resolved');
    expect(escalation.createdByPortalUserId).toBe('portal-user-1');
    expect(mockQuery.mock.calls[0][0]).toContain('updated_by = $10');
    expect(mockQuery.mock.calls[0][0]).toContain('c.account_id = $11');
    expect(mockQuery.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['escalation-1', 'case-1', 'resolved', 'staff-2', 'account-1'])
    );
  });

  it('returns not found when staff updates an escalation outside the case/account scope', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(
      updatePortalEscalationForCase({
        id: 'escalation-2',
        caseId: 'case-1',
        accountId: 'account-1',
        status: 'in_review',
        updatedBy: 'staff-2',
      })
    ).rejects.toThrow('Portal escalation not found for case');
  });
});
