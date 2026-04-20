import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { within } from '@testing-library/react';
import type * as ReactRouterDomModule from 'react-router-dom';
import { vi } from 'vitest';
import WorkbenchDashboardPage from '../WorkbenchDashboardPage';
import { renderWithProviders } from '../../../../test/testUtils';

const analyticsSummary = {
  total_accounts: 50,
  active_accounts: 35,
  total_contacts: 120,
  active_contacts: 80,
  total_donations_ytd: 75000,
  donation_count_ytd: 150,
  average_donation_ytd: 500,
  total_events_ytd: 12,
  total_volunteers: 25,
  total_volunteer_hours_ytd: 450,
  engagement_distribution: {
    high: 30,
    medium: 45,
    low: 25,
    inactive: 20,
  },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDomModule>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
      <a className={className} href={to}>
        {children}
      </a>
    ),
  };
});

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../components/dashboard', () => ({
  QuickActionsWidget: () => <div>Quick Actions</div>,
  QuickLookupWidget: () => <div>Quick Lookup</div>,
}));

vi.mock('../../../../hooks/useDashboardSettings', () => ({
  useDashboardSettings: () => ({
    settings: {
      showQuickActions: true,
      showQuickLookup: true,
      showFocusQueue: true,
      showPinnedWorkstreams: true,
      showModules: true,
      showInsightStrip: true,
      showWorkspaceSummary: true,
    },
    setSettings: vi.fn(),
    resetSettings: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useNavigationPreferences', () => ({
  useNavigationPreferences: () => ({
    pinnedItems: [
      { id: 'contacts', path: '/contacts', name: 'Contacts', shortLabel: 'People', icon: 'C', pinned: true },
    ],
    enabledItems: [
      { id: 'dashboard', path: '/dashboard', name: 'Workbench', shortLabel: 'Workbench', icon: 'D', pinned: true },
      { id: 'tasks', path: '/tasks', name: 'Tasks', shortLabel: 'Tasks', icon: 'T', pinned: false },
    ],
  }),
}));

vi.mock('../../../../routes/routeCatalog', () => ({
  getRouteCatalogEntryById: (id: string) =>
    id === 'contacts' ? { section: 'People' } : id === 'tasks' ? { section: 'Work' } : null,
}));

vi.mock('../../../../routes/routeMeta', () => ({
  getRouteMeta: () => ({
    primaryAction: {
      path: '/cases/new',
      label: 'New Case',
    },
  }),
}));

vi.mock('../../components/DashboardViewSettingsPanel', () => ({
  default: () => <div>Dashboard view settings</div>,
}));

vi.mock('../../context/DashboardDataContext', () => ({
  DashboardDataProvider: ({ children }: { children: ReactNode }) => children,
  WORKBENCH_DASHBOARD_LANES: ['analytics', 'tasks'],
  useDashboardAnalyticsSummary: () => ({ analyticsSummary }),
  useDashboardAssignedCases: () => ({
    assignedCases: [
      {
        id: 'case-1',
        case_number: 'CASE-1',
        title: 'Housing Support',
        due_date: '2026-04-20',
      },
    ],
    assignedCasesTotal: 2,
  }),
  useDashboardCaseSummary: () => ({
    caseSummary: {
      by_priority: { urgent: 2 },
      overdue_cases: 1,
      cases_due_this_week: 4,
    },
  }),
  useDashboardFollowUpSummary: () => ({
    followUpSummary: {
      due_today: 1,
      due_this_week: 3,
    },
  }),
  useDashboardTaskSummary: () => ({
    taskSummary: {
      overdue: 5,
      due_today: 2,
      due_this_week: 6,
    },
  }),
  useDashboardUpcomingFollowUps: () => ({
    upcomingFollowUps: [
      {
        id: 'fu-1',
        title: 'Call client',
        entity_type: 'case',
        case_number: 'CASE-1',
        case_title: 'Housing Support',
        task_subject: null,
        scheduled_date: '2026-04-21',
        scheduled_time: '09:00',
      },
    ],
  }),
}));

describe('WorkbenchDashboardPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders navigation-only primary actions as links and formats metrics with the runtime locale', () => {
    const originalNumberFormat = Intl.NumberFormat;
    const originalDateTimeFormat = Intl.DateTimeFormat;
    const numberFormatSpy = vi
      .spyOn(Intl, 'NumberFormat')
      .mockImplementation(
        (function (
          this: unknown,
          locales?: Intl.LocalesArgument,
          options?: Intl.NumberFormatOptions
        ) {
          return new originalNumberFormat(locales, options);
        } as unknown) as typeof Intl.NumberFormat
      );
    const dateTimeFormatSpy = vi
      .spyOn(Intl, 'DateTimeFormat')
      .mockImplementation(
        (function (
          this: unknown,
          locales?: Intl.LocalesArgument,
          options?: Intl.DateTimeFormatOptions
        ) {
          return new originalDateTimeFormat(locales, options);
        } as unknown) as typeof Intl.DateTimeFormat
      );

    renderWithProviders(<WorkbenchDashboardPage />, { route: '/dashboard' });

    expect(screen.getByRole('link', { name: 'New Case' })).toHaveAttribute('href', '/cases/new');
    const dailyPathsSection = screen.getByRole('heading', { name: /daily paths/i }).closest('section');
    expect(dailyPathsSection).not.toBeNull();
    const pinnedShortcutsSection = screen.getByRole('heading', { name: /pinned shortcuts/i })
      .closest('section');
    expect(pinnedShortcutsSection).not.toBeNull();
    expect(
      within(pinnedShortcutsSection as HTMLElement).getByRole('link', { name: /people/i })
    ).toHaveAttribute('href', '/contacts');
    expect(
      within(dailyPathsSection as HTMLElement).getByRole('link', {
        name: /cases jump into the active service queue and case detail views/i,
      })
    ).toHaveAttribute('href', '/cases');
    expect(
      within(dailyPathsSection as HTMLElement).getByRole('link', { name: /donations/i })
    ).toHaveAttribute('href', '/donations');
    expect(
      within(dailyPathsSection as HTMLElement).getByRole('link', { name: /reports/i })
    ).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: /Call client/ })).toBeInTheDocument();
    expect(numberFormatSpy).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        style: 'currency',
        currency: 'CAD',
      })
    );
    expect(numberFormatSpy).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        maximumFractionDigits: 0,
      })
    );
    expect(dateTimeFormatSpy).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        dateStyle: 'medium',
      })
    );
  });
});
