import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CasePortalEscalationsPanel from '../CasePortalEscalationsPanel';
import { casesApiClient } from '../../api/casesApiClient';

vi.mock('../../../../components/neo-brutalist', () => ({
  BrutalBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  BrutalButton: ({
    children,
    disabled,
    onClick,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

const showError = vi.fn();
const showSuccess = vi.fn();

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({ showError, showSuccess }),
}));

vi.mock('../../api/casesApiClient', () => ({
  casesApiClient: {
    listCasePortalEscalations: vi.fn(),
    updateCasePortalEscalation: vi.fn(),
  },
}));

const escalation = {
  id: 'escalation-1',
  caseId: 'case-1',
  contactId: 'contact-1',
  accountId: 'account-1',
  portalUserId: 'portal-user-1',
  createdByPortalUserId: 'portal-user-1',
  category: 'case_review',
  reason: 'Please review my benefits documents.',
  severity: 'normal' as const,
  sensitivity: 'standard' as const,
  assigneeUserId: null,
  slaDueAt: null,
  status: 'open' as const,
  resolutionSummary: null,
  createdAt: '2031-12-01T00:00:00.000Z',
  updatedAt: '2031-12-01T00:00:00.000Z',
};

describe('CasePortalEscalationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(casesApiClient.listCasePortalEscalations).mockResolvedValue([escalation]);
    vi.mocked(casesApiClient.updateCasePortalEscalation).mockResolvedValue({
      ...escalation,
      status: 'in_review',
      resolutionSummary: 'Staff is reviewing.',
    });
  });

  it('shows portal review requests and updates triage state', async () => {
    render(<CasePortalEscalationsPanel caseId="case-1" />);

    expect(await screen.findByText('Please review my benefits documents.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'in_review' },
    });
    fireEvent.change(screen.getByLabelText(/resolution summary/i), {
      target: { value: 'Staff is reviewing.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(casesApiClient.updateCasePortalEscalation).toHaveBeenCalledWith(
        'case-1',
        'escalation-1',
        {
          status: 'in_review',
          resolution_summary: 'Staff is reviewing.',
        }
      );
    });
  });
});
