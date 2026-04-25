import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouterDomModule from 'react-router-dom';
import { vi } from 'vitest';
import CaseListPage from '../CaseListPage';

const navigateMock = vi.hoisted(() => vi.fn());
const dispatchMock = vi.hoisted(() => vi.fn());
const listQueueViewsMock = vi.hoisted(() => vi.fn());
const saveQueueViewMock = vi.hoisted(() => vi.fn());
const archiveQueueViewMock = vi.hoisted(() => vi.fn());
const validCaseId = '44444444-4444-4444-8444-444444444444';

const mockState = {
  cases: {
    list: {
      cases: [
        {
          id: validCaseId,
          case_number: 'CASE-100',
          title: 'Housing support',
          description: 'Intake support',
          contact_first_name: 'Taylor',
          contact_last_name: 'River',
          case_type_name: 'General',
          status_name: 'Open',
          status_type: 'active',
          priority: 'medium',
          assigned_to: null,
          assigned_first_name: null,
          assigned_last_name: null,
          due_date: null,
          created_at: '2026-03-01T00:00:00.000Z',
          is_urgent: false,
          provenance: {
            system: 'imported',
            cluster_id: 'cluster-1',
            primary_label: 'Westcat Intake Cluster',
            record_type: 'case_note',
            source_tables: ['contact_log'],
            source_files: ['westcat.csv'],
            source_role_breakdown: [
              {
                source_role: 'primary_case',
                source_tables: ['contact_log'],
                source_row_count: 1,
                source_row_ids: ['contact_log:1'],
              },
            ],
            participant_ids: ['contact-1'],
            source_row_ids: ['contact_log:1'],
            source_row_count: 1,
            source_table_count: 1,
            source_file_count: 1,
            source_type_breakdown: ['contact_log'],
            link_confidence: 0.95,
            confidence_label: 'high',
            is_low_confidence: false,
          },
        },
      ],
      summary: {
        open_cases: 1,
        by_priority: { urgent: 0 },
        overdue_cases: 0,
        cases_due_this_week: 0,
        unassigned_cases: 1,
      },
      total: 1,
      loading: false,
      error: null,
      filters: {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      },
      selectedCaseIds: [],
    },
    core: {
      caseTypes: [],
      caseStatuses: [],
    },
  },
};

const setViewport = (isDesktopViewport: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)' ? isDesktopViewport : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDomModule>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

vi.mock('../../api/queueViewsApiClient', () => ({
  queueViewsApiClient: {
    listQueueViews: (...args: unknown[]) => listQueueViewsMock(...args),
    saveQueueView: (...args: unknown[]) => saveQueueViewMock(...args),
    archiveQueueView: (...args: unknown[]) => archiveQueueViewMock(...args),
  },
}));

vi.mock('../../../../features/cases/state', () => ({
  default: () => ({
    cases: [],
    currentCase: null,
    caseTypes: [],
    caseStatuses: [],
    caseNotes: [],
    caseMilestones: [],
    caseRelationships: [],
    caseServices: [],
    caseOutcomeDefinitions: [],
    interactionOutcomeImpacts: {},
    summary: null,
    total: 0,
    loading: false,
    error: null,
    outcomesLoading: false,
    outcomesSaving: false,
    outcomesError: null,
    filters: { page: 1, limit: 20, sort_by: 'created_at', sort_order: 'desc' },
    selectedCaseIds: [],
    contactCasesByContactId: {},
  }),
  casesV2Reducer: () => ({
    cases: [],
    currentCase: null,
    caseTypes: [],
    caseStatuses: [],
    caseNotes: [],
    caseMilestones: [],
    caseRelationships: [],
    caseServices: [],
    caseOutcomeDefinitions: [],
    interactionOutcomeImpacts: {},
    summary: null,
    total: 0,
    loading: false,
    error: null,
    outcomesLoading: false,
    outcomesSaving: false,
    outcomesError: null,
    filters: { page: 1, limit: 20, sort_by: 'created_at', sort_order: 'desc' },
    selectedCaseIds: [],
    contactCasesByContactId: {},
  }),
  fetchCases: (payload: unknown) => ({ type: 'cases/fetchCases', payload }),
  fetchCaseSummary: () => ({ type: 'cases/fetchSummary' }),
  fetchCaseTypes: () => ({ type: 'cases/fetchTypes' }),
  fetchCaseStatuses: () => ({ type: 'cases/fetchStatuses' }),
  fetchCasesByContact: (payload: unknown) => ({ type: 'cases/fetchCasesByContact', payload }),
  setFilters: (payload: unknown) => ({ type: 'cases/setFilters', payload }),
  clearFilters: () => ({ type: 'cases/clearFilters' }),
  toggleCaseSelection: (payload: unknown) => ({ type: 'cases/toggleSelection', payload }),
  selectAllCases: () => ({ type: 'cases/selectAll' }),
  clearCaseSelection: () => ({ type: 'cases/clearSelection' }),
  bulkUpdateCaseStatus: (payload: unknown) => ({ type: 'cases/bulkUpdateStatus', payload }),
}));

vi.mock('../../../../components/neo-brutalist', () => ({
  NeoBrutalistLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalCard: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
  BrutalButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  BrutalBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  BrutalInput: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('../../../../features/cases/components/CaseListFiltersBar', () => ({
  default: () => <div>Filters</div>,
}));

describe('Case list page', () => {
  const renderCaseListPage = () =>
    render(
      <MemoryRouter initialEntries={['/cases']}>
        <CaseListPage />
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    listQueueViewsMock.mockResolvedValue([]);
    saveQueueViewMock.mockImplementation(async (payload: {
      surface: string;
      name: string;
      filters: Record<string, unknown>;
      sort?: Record<string, unknown>;
      rowLimit?: number;
    }) => ({
      id: 'server-view-1',
      ownerUserId: 'user-1',
      surface: payload.surface,
      name: payload.name,
      filters: payload.filters,
      columns: [],
      sort: payload.sort || {},
      rowLimit: payload.rowLimit || 20,
      dashboardBehavior: {},
      permissionScope: [],
      status: 'active',
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    }));
    archiveQueueViewMock.mockResolvedValue(undefined);
    mockState.cases.list.total = 1;
    mockState.cases.list.filters = {
      page: 1,
      limit: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    };
    mockState.cases.list.selectedCaseIds = [];
    setViewport(false);
  });

  it('renders only the mobile results tree and paginator on small viewports', () => {
    mockState.cases.list.total = 40;

    renderCaseListPage();

    expect(screen.getAllByTestId('mobile-case-card')).toHaveLength(1);
    expect(screen.queryByLabelText('Select all visible cases')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2 · 40 cases')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cases per page')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('CASE-100'));

    expect(navigateMock).toHaveBeenCalledWith(`/cases/${validCaseId}`);
  });

  it('renders only the desktop results tree and paginator on wider viewports', () => {
    mockState.cases.list.total = 40;
    setViewport(true);

    renderCaseListPage();

    expect(screen.queryAllByTestId('mobile-case-card')).toHaveLength(0);
    expect(screen.getByLabelText('Select all visible cases')).toBeInTheDocument();
    expect(screen.getByLabelText('Cases per page')).toBeInTheDocument();
    expect(screen.queryByText('Page 1 of 2 · 40 cases')).not.toBeInTheDocument();
  });

  it('shows provenance badges and syncs the imported-only filter', () => {
    renderCaseListPage();

    expect(screen.getByText('Imported')).toBeInTheDocument();
    expect(screen.getByText('1 table')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show imported cases only'));
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cases/setFilters',
        payload: expect.objectContaining({ imported_only: true }),
      })
    );
  });

  it('hydrates deep-link filters before the initial cases fetch', () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/cases?search=urgent%20intake&status=status-1&imported_only=true&quick_filter=due_soon&due_within_days=5&page=2&limit=10&sort_by=due_date&sort_order=asc',
        ]}
      >
        <CaseListPage />
      </MemoryRouter>
    );

    const fetchCaseCalls = dispatchMock.mock.calls.filter(
      ([action]) => action?.type === 'cases/fetchCases'
    );

    expect(fetchCaseCalls).toHaveLength(1);
    expect(fetchCaseCalls[0]?.[0]).toEqual(
      expect.objectContaining({
        type: 'cases/fetchCases',
        payload: expect.objectContaining({
          search: 'urgent intake',
          status_id: 'status-1',
          imported_only: true,
          quick_filter: 'due_soon',
          due_within_days: 5,
          page: 2,
          limit: 10,
          sort_by: 'due_date',
          sort_order: 'asc',
        }),
      })
    );
  });

  it('loads server-backed saved views for the cases queue', async () => {
    listQueueViewsMock.mockResolvedValue([
      {
        id: 'queue-view-1',
        ownerUserId: 'user-1',
        surface: 'cases',
        name: 'Urgent cases',
        filters: {
          search: 'housing',
          imported_only: true,
          quick_filter: 'urgent',
        },
        columns: [],
        sort: { sort_by: 'created_at', sort_order: 'desc' },
        rowLimit: 20,
        dashboardBehavior: {},
        permissionScope: [],
        status: 'active',
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
    ]);

    renderCaseListPage();

    expect(await screen.findByRole('option', { name: 'Urgent cases' })).toBeInTheDocument();
    expect(listQueueViewsMock).toHaveBeenCalledWith('cases');

    fireEvent.change(screen.getByLabelText('Saved case views'), {
      target: { value: 'queue-view-1' },
    });

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cases/setFilters',
        payload: expect.objectContaining({
          search: 'housing',
          imported_only: true,
          quick_filter: 'urgent',
        }),
      })
    );
  });

  it('falls back to local saved views when the server queue view API is unavailable', async () => {
    listQueueViewsMock.mockRejectedValue(new Error('Forbidden'));
    localStorage.setItem(
      'cases.savedViews',
      JSON.stringify([
        {
          id: 'local-view-1',
          name: 'Local housing queue',
          quickFilter: 'all',
          filters: { search: 'local housing' },
        },
      ])
    );

    renderCaseListPage();

    expect(await screen.findByRole('option', { name: 'Local housing queue' })).toBeInTheDocument();
    expect(
      screen.getByText('Server saved views are unavailable. Local saved views are being used on this device.')
    ).toBeInTheDocument();
  });

  it('saves, reapplies, and deletes a saved view so staff can recover queue state', async () => {
    renderCaseListPage();

    fireEvent.change(screen.getByLabelText('Search cases'), {
      target: { value: 'Housing support' },
    });
    fireEvent.click(screen.getByLabelText('Show imported cases only'));
    fireEvent.change(screen.getByLabelText('Saved view name'), {
      target: { value: 'Imported housing queue' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save view/i }));

    await waitFor(() => {
      expect(saveQueueViewMock).toHaveBeenCalledWith(
        expect.objectContaining({
          surface: 'cases',
          name: 'Imported housing queue',
          filters: expect.objectContaining({
            search: 'Housing support',
            imported_only: true,
          }),
        })
      );
    });

    const storedViews = JSON.parse(localStorage.getItem('cases.savedViews') || '[]') as Array<{
      id: string;
      name: string;
      filters: { search?: string; imported_only?: boolean };
    }>;

    expect(storedViews).toHaveLength(1);
    expect(storedViews[0]).toMatchObject({
      name: 'Imported housing queue',
      filters: {
        search: 'Housing support',
        imported_only: true,
      },
    });
    expect(screen.getByLabelText('Saved case views')).toHaveValue('server-view-1');

    dispatchMock.mockClear();
    fireEvent.change(screen.getByLabelText('Saved case views'), {
      target: { value: 'server-view-1' },
    });

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cases/setFilters',
        payload: expect.objectContaining({
          search: 'Housing support',
          imported_only: true,
        }),
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByLabelText('Saved case views')).toHaveValue('');
    expect(localStorage.getItem('cases.savedViews')).toBe('[]');
    expect(archiveQueueViewMock).toHaveBeenCalledWith('cases', 'server-view-1');
  });
});
