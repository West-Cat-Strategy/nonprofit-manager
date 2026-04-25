import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CaseReassessmentPanel from '../CaseReassessmentPanel';
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
    cancelCaseReassessment: vi.fn(),
    completeCaseReassessment: vi.fn(),
    createCaseReassessment: vi.fn(),
    listCaseReassessments: vi.fn(),
    updateCaseReassessment: vi.fn(),
  },
}));

const reassessment = {
  id: 'reassessment-1',
  organization_id: 'org-1',
  case_id: 'case-1',
  follow_up_id: 'follow-up-1',
  owner_user_id: 'owner-1',
  status: 'scheduled' as const,
  title: 'Quarterly review',
  summary: 'Review housing stability',
  earliest_review_date: '2032-01-01',
  due_date: '2032-01-15',
  latest_review_date: '2032-01-31',
  completion_summary: null,
  cancellation_reason: null,
  completed_at: null,
  completed_by: null,
  created_by: 'owner-1',
  updated_by: 'owner-1',
  created_at: '2031-12-01T00:00:00.000Z',
  updated_at: '2031-12-01T00:00:00.000Z',
};

describe('CaseReassessmentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(casesApiClient.listCaseReassessments).mockResolvedValue([reassessment]);
    vi.mocked(casesApiClient.createCaseReassessment).mockResolvedValue(reassessment);
    vi.mocked(casesApiClient.completeCaseReassessment).mockResolvedValue({
      reassessment: { ...reassessment, status: 'completed', completion_summary: 'Done' },
      next_reassessment: null,
    });
    vi.mocked(casesApiClient.cancelCaseReassessment).mockResolvedValue({
      ...reassessment,
      status: 'cancelled',
      cancellation_reason: 'Closed early',
    });
  });

  it('shows current reassessment state and opens the create form', async () => {
    render(<CaseReassessmentPanel caseId="case-1" defaultOwnerUserId="owner-1" />);

    expect(await screen.findByText('Quarterly review')).toBeInTheDocument();
    expect(screen.getByText(/Due:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new reassessment/i }));

    expect(screen.getByRole('heading', { name: /create reassessment/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/owner user id/i)).not.toBeInTheDocument();
  });

  it('requires an outcome when completing a reassessment', async () => {
    render(
      <CaseReassessmentPanel
        caseId="case-1"
        outcomeDefinitions={[
          {
            id: 'outcome-1',
            key: 'stable',
            name: 'Stable housing',
            description: null,
            category: null,
            is_active: true,
            is_reportable: true,
            sort_order: 1,
            created_at: '2031-01-01T00:00:00.000Z',
            updated_at: '2031-01-01T00:00:00.000Z',
          },
        ]}
      />
    );

    await screen.findByText('Quarterly review');
    fireEvent.click(screen.getByRole('button', { name: /^complete$/i }));
    fireEvent.change(screen.getByLabelText(/completion summary/i), {
      target: { value: 'Reviewed service plan' },
    });
    fireEvent.click(screen.getByLabelText(/stable housing/i));
    fireEvent.click(screen.getByRole('button', { name: /save completion/i }));

    await waitFor(() => {
      expect(casesApiClient.completeCaseReassessment).toHaveBeenCalledWith(
        'case-1',
        'reassessment-1',
        {
          completion_summary: 'Reviewed service plan',
          outcome_definition_ids: ['outcome-1'],
        }
      );
    });
  });

  it('can schedule the next reassessment when completing the current one', async () => {
    render(
      <CaseReassessmentPanel
        caseId="case-1"
        outcomeDefinitions={[
          {
            id: 'outcome-1',
            key: 'stable',
            name: 'Stable housing',
            description: null,
            category: null,
            is_active: true,
            is_reportable: true,
            sort_order: 1,
            created_at: '2031-01-01T00:00:00.000Z',
            updated_at: '2031-01-01T00:00:00.000Z',
          },
        ]}
      />
    );

    await screen.findByText('Quarterly review');
    fireEvent.click(screen.getByRole('button', { name: /^complete$/i }));
    fireEvent.change(screen.getByLabelText(/completion summary/i), {
      target: { value: 'Reviewed service plan' },
    });
    fireEvent.click(screen.getByLabelText(/stable housing/i));
    fireEvent.click(screen.getByLabelText(/schedule next reassessment/i));
    fireEvent.change(screen.getByLabelText(/next due date/i), {
      target: { value: '2032-04-15' },
    });
    fireEvent.change(screen.getByLabelText(/next summary/i), {
      target: { value: 'Recheck housing plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save completion/i }));

    await waitFor(() => {
      expect(casesApiClient.completeCaseReassessment).toHaveBeenCalledWith(
        'case-1',
        'reassessment-1',
        expect.objectContaining({
          completion_summary: 'Reviewed service plan',
          outcome_definition_ids: ['outcome-1'],
          next_title: 'Quarterly review',
          next_due_date: '2032-04-15',
          next_summary: 'Recheck housing plan',
        })
      );
    });
  });

  it('cancels a reassessment with a reason', async () => {
    render(<CaseReassessmentPanel caseId="case-1" />);

    await screen.findByText('Quarterly review');
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    fireEvent.change(screen.getByLabelText(/cancellation reason/i), {
      target: { value: 'Closed early' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm cancel/i }));

    await waitFor(() => {
      expect(casesApiClient.cancelCaseReassessment).toHaveBeenCalledWith(
        'case-1',
        'reassessment-1',
        { cancellation_reason: 'Closed early' }
      );
    });
  });
});
