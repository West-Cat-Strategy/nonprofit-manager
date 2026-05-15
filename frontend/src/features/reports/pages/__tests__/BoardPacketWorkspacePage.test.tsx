import { screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import BoardPacketWorkspacePage from '../BoardPacketWorkspacePage';
import { renderWithProviders } from '../../../../test/testUtils';

const {
  fetchSavedReportsMock,
  fetchScheduledReportsMock,
  fetchWorkqueueSummaryMock,
  fetchWorkflowCoverageReportMock,
  listTemplatesMock,
} = vi.hoisted(() => ({
  fetchSavedReportsMock: vi.fn(),
  fetchScheduledReportsMock: vi.fn(),
  fetchWorkqueueSummaryMock: vi.fn(),
  fetchWorkflowCoverageReportMock: vi.fn(),
  listTemplatesMock: vi.fn(),
}));

const buildAuthState = (permissions: string[]) => ({
  auth: {
    user: {
      id: 'user-1',
      email: 'board@example.org',
      firstName: 'Board',
      lastName: 'Reader',
      role: 'staff',
      permissions,
    },
    isAuthenticated: true,
    authLoading: false,
    loading: false,
  },
});

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../savedReports/api/savedReportsApiClient', () => ({
  savedReportsApiClient: {
    fetchSavedReports: fetchSavedReportsMock,
  },
}));

vi.mock('../../../scheduledReports/api/scheduledReportsApiClient', () => ({
  scheduledReportsApiClient: {
    fetchScheduledReports: fetchScheduledReportsMock,
  },
}));

vi.mock('../../../dashboard/api/dashboardApiClient', () => ({
  dashboardApiClient: {
    fetchWorkqueueSummary: fetchWorkqueueSummaryMock,
  },
}));

vi.mock('../../api/reportsApiClient', () => ({
  reportsApiClient: {
    fetchWorkflowCoverageReport: fetchWorkflowCoverageReportMock,
    listTemplates: listTemplatesMock,
  },
}));

describe('BoardPacketWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSavedReportsMock.mockResolvedValue({
      items: [
        {
          id: 'saved-1',
          name: 'Executive Board Packet',
          description: 'Monthly executive review',
          entity: 'donations',
          created_at: '2026-05-01T00:00:00.000Z',
          updated_at: '2026-05-13T16:00:00.000Z',
          is_public: true,
          public_token: 'public-token',
        },
        {
          id: 'saved-2',
          name: 'Program Snapshot',
          description: 'Operations view',
          entity: 'programs',
          created_at: '2026-05-02T00:00:00.000Z',
          updated_at: '2026-05-12T16:00:00.000Z',
          is_public: false,
          public_token: null,
        },
      ],
      pagination: { page: 1, limit: 25, total: 2, total_pages: 1 },
    });
    fetchScheduledReportsMock.mockResolvedValue([
      {
        id: 'schedule-1',
        organization_id: 'org-1',
        saved_report_id: 'saved-1',
        name: 'Board packet monthly delivery',
        recipients: ['director@example.org'],
        format: 'xlsx',
        frequency: 'monthly',
        timezone: 'America/Vancouver',
        hour: 9,
        minute: 0,
        day_of_month: 1,
        is_active: true,
        next_run_at: '2026-06-01T16:00:00.000Z',
        last_error: null,
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
    ]);
    listTemplatesMock.mockResolvedValue([
      {
        id: 'template-1',
        name: 'Executive Board Pack Fundraising Snapshot',
        description: 'Board-ready fundraising totals',
        category: 'fundraising',
        tags: ['board-pack', 'executive', 'board'],
        entity: 'donations',
        template_definition: { name: 'Executive Board Pack Fundraising Snapshot', entity: 'donations' },
        is_system: true,
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
    ]);
    fetchWorkqueueSummaryMock.mockResolvedValue([
      {
        id: 'portal_escalations',
        label: 'Portal escalations',
        count: 3,
        detail: 'Client items need staff review',
        permissionScope: ['cases:view'],
        primaryAction: { label: 'Open', href: '/cases?queue=portal-escalations' },
      },
    ]);
    fetchWorkflowCoverageReportMock.mockResolvedValue({
      summary: {
        casesWithGaps: 2,
        missingConversationResolutionCount: 1,
        missingAppointmentNoteCount: 1,
        missingAppointmentOutcomeCount: 0,
        missingFollowUpNoteCount: 1,
        missingFollowUpOutcomeCount: 0,
        missingReminderOfferCount: 0,
        missingAttendanceLinkageCount: 0,
        missingCaseStatusOutcomeCount: 1,
        totalGaps: 4,
      },
      items: [
        {
          caseId: 'case-1',
          caseNumber: 'CASE-1',
          caseTitle: 'Housing support',
          contactName: 'Avery',
          assignedToId: 'user-2',
          assignedToName: 'Morgan Staff',
          statusName: 'Active',
          statusType: 'active',
          missingConversationResolutionCount: 1,
          missingAppointmentNoteCount: 0,
          missingAppointmentOutcomeCount: 0,
          missingFollowUpNoteCount: 1,
          missingFollowUpOutcomeCount: 0,
          missingReminderOfferCount: 0,
          missingAttendanceLinkageCount: 0,
          missingCaseStatusOutcomeCount: 0,
          totalGaps: 2,
        },
      ],
    });
  });

  it('assembles a read-only board packet workspace from existing reporting seams', async () => {
    renderWithProviders(<BoardPacketWorkspacePage />, {
      preloadedState: buildAuthState(['report:view', 'scheduled_report:view']),
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /board packet workspace/i })).toBeInTheDocument();
      expect(screen.getAllByText('Executive Board Packet')).toHaveLength(2);
    });

    expect(fetchSavedReportsMock).toHaveBeenCalledWith({ limit: 25, summary: true });
    expect(fetchScheduledReportsMock).toHaveBeenCalled();
    expect(listTemplatesMock).toHaveBeenCalled();
    expect(fetchWorkqueueSummaryMock).toHaveBeenCalled();
    expect(fetchWorkflowCoverageReportMock).toHaveBeenCalled();

    expect(screen.getByText('Executive Board Pack Fundraising Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Board packet monthly delivery')).toBeInTheDocument();
    expect(screen.getByText('Portal escalations')).toBeInTheDocument();
    expect(screen.getByText(/4 workflow coverage gaps/i)).toBeInTheDocument();
    expect(screen.getByText(/Snapshot link available/i)).toBeInTheDocument();

    const packetAssembly = screen.getByRole('heading', { name: /packet assembly/i }).closest('section');
    expect(packetAssembly).not.toBeNull();
    expect(
      within(packetAssembly as HTMLElement).getByRole('link', { name: /open saved/i })
    ).toHaveAttribute('href', '/reports/saved');
    expect(
      within(packetAssembly as HTMLElement).getByRole('link', { name: /open schedules/i })
    ).toHaveAttribute('href', '/reports/scheduled');
  });
});
