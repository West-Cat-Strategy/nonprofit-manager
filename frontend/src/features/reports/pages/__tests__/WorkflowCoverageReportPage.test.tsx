import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import WorkflowCoverageReportPage from '../WorkflowCoverageReportPage';
import { renderWithProviders } from '../../../../test/testUtils';

const {
  controllerStateRef,
  handleFilterChangeMock,
  handleMissingFilterChangeMock,
  handleRetryMock,
} = vi.hoisted(() => ({
  controllerStateRef: { current: null } as WorkflowCoverageControllerStateRef,
  handleFilterChangeMock: vi.fn(),
  handleMissingFilterChangeMock: vi.fn(),
  handleRetryMock: vi.fn(),
}));

const report = {
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
};

type WorkflowCoverageControllerState = {
  error: string | null;
  filters: Record<string, unknown>;
  handleFilterChange: (key: string, value: string | undefined) => void;
  handleMissingFilterChange: (value: string) => void;
  handleRetry: () => void;
  loading: boolean;
  report: typeof report | null;
};

type WorkflowCoverageControllerStateRef = {
  current: WorkflowCoverageControllerState | null;
};

vi.mock('../../hooks/useWorkflowCoverageReportController', () => ({
  default: () => controllerStateRef.current,
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('WorkflowCoverageReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerStateRef.current = {
      error: null,
      filters: {},
      handleFilterChange: handleFilterChangeMock,
      handleMissingFilterChange: handleMissingFilterChangeMock,
      handleRetry: handleRetryMock,
      loading: false,
      report,
    };
  });

  it('renders summary and case gaps from the controller report', () => {
    renderWithProviders(<WorkflowCoverageReportPage />);

    expect(screen.getByRole('heading', { name: /workflow coverage report/i })).toBeInTheDocument();
    expect(screen.getByText('CASE-001')).toBeInTheDocument();
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument();
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);
  });

  it('delegates filter changes and retry through the controller', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.error = 'Failed to load workflow coverage report';
    controllerStateRef.current.report = null;

    renderWithProviders(<WorkflowCoverageReportPage />);

    await user.type(screen.getByLabelText(/owner id/i), 'user-1');
    await user.selectOptions(screen.getByLabelText(/case status/i), 'active');
    await user.selectOptions(screen.getByLabelText(/missing/i), 'outcome');
    await user.click(screen.getByRole('button', { name: /^retry$/i }));

    expect(handleFilterChangeMock).toHaveBeenCalledWith('ownerId', 'u');
    expect(handleFilterChangeMock).toHaveBeenCalledWith('statusType', 'active');
    expect(handleMissingFilterChangeMock).toHaveBeenCalledWith('outcome');
    expect(handleRetryMock).toHaveBeenCalled();
  });
});
