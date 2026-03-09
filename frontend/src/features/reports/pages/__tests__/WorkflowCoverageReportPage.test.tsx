import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import WorkflowCoverageReportPage from '../WorkflowCoverageReportPage';
import { renderWithProviders } from '../../../../test/testUtils';

const getMock = vi.fn();

vi.mock('../../../../services/api', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('WorkflowCoverageReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summary and case gaps from the workflow coverage report', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            caseId: 'case-1',
            caseNumber: 'CASE-001',
            caseTitle: 'Housing support',
            contactName: 'Casey Client',
            assignedToId: 'user-1',
            assignedToName: 'Alex Rivera',
            statusName: 'Open',
            statusType: 'active',
            missingConversationResolutionCount: 1,
            missingAppointmentNoteCount: 2,
            missingAppointmentOutcomeCount: 1,
            missingFollowUpNoteCount: 1,
            missingFollowUpOutcomeCount: 1,
            missingReminderOfferCount: 1,
            missingAttendanceLinkageCount: 0,
            missingCaseStatusOutcomeCount: 0,
            totalGaps: 7,
          },
        ],
        summary: {
          casesWithGaps: 1,
          missingConversationResolutionCount: 1,
          missingAppointmentNoteCount: 2,
          missingAppointmentOutcomeCount: 1,
          missingFollowUpNoteCount: 1,
          missingFollowUpOutcomeCount: 1,
          missingReminderOfferCount: 1,
          missingAttendanceLinkageCount: 0,
          missingCaseStatusOutcomeCount: 0,
          totalGaps: 7,
        },
      },
    });

    renderWithProviders(<WorkflowCoverageReportPage />);

    expect(
      await screen.findByRole('heading', { name: /workflow coverage report/i })
    ).toBeInTheDocument();
    expect(await screen.findByText('CASE-001')).toBeInTheDocument();

    expect(getMock).toHaveBeenCalledWith('/v2/reports/workflow-coverage', { params: {} });
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('passes selected missing filter to the API request', async () => {
    const user = userEvent.setup();

    getMock.mockResolvedValue({
      data: {
        items: [],
        summary: {
          casesWithGaps: 0,
          missingConversationResolutionCount: 0,
          missingAppointmentNoteCount: 0,
          missingAppointmentOutcomeCount: 0,
          missingFollowUpNoteCount: 0,
          missingFollowUpOutcomeCount: 0,
          missingReminderOfferCount: 0,
          missingAttendanceLinkageCount: 0,
          missingCaseStatusOutcomeCount: 0,
          totalGaps: 0,
        },
      },
    });

    renderWithProviders(<WorkflowCoverageReportPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/v2/reports/workflow-coverage', { params: {} });
    });

    await user.selectOptions(screen.getByLabelText(/missing/i), 'outcome');

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith('/v2/reports/workflow-coverage', {
        params: { missing: 'outcome' },
      });
    });
  });
});
