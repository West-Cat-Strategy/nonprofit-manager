import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GrantsPage from '../GrantsPage';
import type {
  FundedProgram,
  GrantActivityLog,
  GrantApplication,
  GrantAward,
  GrantCalendarItem,
  GrantDisbursement,
  GrantDocument,
  GrantFunder,
  GrantPagination,
  GrantProgram,
  GrantReport,
  GrantSummary,
  PaginatedGrantResult,
  RecipientOrganization,
} from '../../types/contracts';

const apiMocks = vi.hoisted(() => ({
  listFunders: vi.fn(),
  listPrograms: vi.fn(),
  listRecipients: vi.fn(),
  listFundedPrograms: vi.fn(),
  listApplications: vi.fn(),
  listAwards: vi.fn(),
  listReports: vi.fn(),
  listDocuments: vi.fn(),
  listDisbursements: vi.fn(),
  listActivities: vi.fn(),
  getCalendar: vi.fn(),
  getSummary: vi.fn(),
  updateApplicationStatus: vi.fn(),
  awardApplication: vi.fn(),
  updateApplication: vi.fn(),
  createApplication: vi.fn(),
  updateAward: vi.fn(),
  createAward: vi.fn(),
  updateDisbursement: vi.fn(),
  createDisbursement: vi.fn(),
  updateReport: vi.fn(),
  createReport: vi.fn(),
  updateDocument: vi.fn(),
  createDocument: vi.fn(),
  updateFunder: vi.fn(),
  createFunder: vi.fn(),
  updateProgram: vi.fn(),
  createProgram: vi.fn(),
  updateRecipient: vi.fn(),
  createRecipient: vi.fn(),
  updateFundedProgram: vi.fn(),
  createFundedProgram: vi.fn(),
  deleteFunder: vi.fn(),
  deleteProgram: vi.fn(),
  deleteRecipient: vi.fn(),
  deleteFundedProgram: vi.fn(),
  deleteApplication: vi.fn(),
  deleteAward: vi.fn(),
  deleteDisbursement: vi.fn(),
  deleteReport: vi.fn(),
  deleteDocument: vi.fn(),
  exportGrants: vi.fn(),
}));

vi.mock('../../api/grantsApiClient', () => ({
  grantsApiClient: apiMocks,
}));

const pagination: GrantPagination = {
  page: 1,
  limit: 25,
  total: 1,
  total_pages: 1,
};

const summary: GrantSummary = {
  total_funders: 1,
  total_programs: 0,
  total_recipients: 0,
  total_funded_programs: 0,
  total_applications: 0,
  draft_applications: 0,
  submitted_applications: 0,
  approved_applications: 0,
  declined_applications: 0,
  total_awards: 0,
  active_awards: 0,
  total_awarded_amount: 0,
  committed_amount: 0,
  total_disbursed_amount: 0,
  outstanding_amount: 0,
  overdue_reports: 0,
  upcoming_reports: 0,
  upcoming_disbursements: 0,
  by_status: [],
  by_jurisdiction: [],
  recent_activity: [],
  upcoming_items: [],
};

function buildFunder(overrides: Partial<GrantFunder> = {}): GrantFunder {
  return {
    id: 'funder-1',
    organization_id: 'org-1',
    name: 'Alpha Funder',
    jurisdiction: 'federal',
    funder_type: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    website: null,
    notes: null,
    active: true,
    created_by: null,
    modified_by: null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function paginated<T>(data: T[]): PaginatedGrantResult<T> {
  return {
    data,
    pagination,
  };
}

function setupCommonApiMocks() {
  apiMocks.getSummary.mockResolvedValue(summary);
  apiMocks.listPrograms.mockResolvedValue(paginated<GrantProgram>([]));
  apiMocks.listRecipients.mockResolvedValue(paginated<RecipientOrganization>([]));
  apiMocks.listFundedPrograms.mockResolvedValue(paginated<FundedProgram>([]));
  apiMocks.listApplications.mockResolvedValue(paginated<GrantApplication>([]));
  apiMocks.listAwards.mockResolvedValue(paginated<GrantAward>([]));
  apiMocks.listReports.mockResolvedValue(paginated<GrantReport>([]));
  apiMocks.listDocuments.mockResolvedValue(paginated<GrantDocument>([]));
  apiMocks.listDisbursements.mockResolvedValue(paginated<GrantDisbursement>([]));
  apiMocks.listActivities.mockResolvedValue(paginated<GrantActivityLog>([]));
  apiMocks.getCalendar.mockResolvedValue([] as GrantCalendarItem[]);
}

describe('GrantsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCommonApiMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses cached lookups when filters change', async () => {
    apiMocks.listFunders.mockImplementation((query?: { limit?: number }) => {
      if (query?.limit === 100) {
        return Promise.resolve(paginated([buildFunder()]));
      }

      return Promise.resolve(paginated([buildFunder({ name: query?.jurisdiction ? 'Federal Funder' : 'Alpha Funder' })]));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Alpha Funder').length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getAllByLabelText('Jurisdiction')[0], {
      target: { value: 'federal' },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Federal Funder').length).toBeGreaterThan(0);
    });

    expect(apiMocks.listPrograms).toHaveBeenCalledTimes(1);
    expect(apiMocks.listRecipients).toHaveBeenCalledTimes(1);
    expect(apiMocks.listFundedPrograms).toHaveBeenCalledTimes(1);
    expect(apiMocks.listApplications).toHaveBeenCalledTimes(1);
    expect(apiMocks.listAwards).toHaveBeenCalledTimes(1);
    expect(apiMocks.listReports).toHaveBeenCalledTimes(1);
    expect(apiMocks.listDocuments).toHaveBeenCalledTimes(1);
    expect(apiMocks.listFunders).toHaveBeenCalledTimes(3);
  });

  it('ignores stale list responses when a newer request finishes later', async () => {
    const staleRows = createDeferred<PaginatedGrantResult<GrantFunder>>();
    const freshRows = createDeferred<PaginatedGrantResult<GrantFunder>>();
    let rowRequestCount = 0;

    apiMocks.listFunders.mockImplementation((query?: { limit?: number }) => {
      if (query?.limit === 100) {
        return Promise.resolve(paginated([buildFunder()]));
      }

      rowRequestCount += 1;
      return rowRequestCount === 1 ? staleRows.promise : freshRows.promise;
    });

    renderPage();

    await waitFor(() => {
      expect(apiMocks.listFunders).toHaveBeenCalledTimes(2);
    });

    fireEvent.change(screen.getAllByLabelText('Jurisdiction')[0], {
      target: { value: 'federal' },
    });

    await waitFor(() => {
      expect(apiMocks.listFunders).toHaveBeenCalledTimes(3);
    });

    freshRows.resolve(paginated([buildFunder({ id: 'funder-2', name: 'Fresh Funder' })]));

    await waitFor(() => {
      expect(screen.getAllByText('Fresh Funder').length).toBeGreaterThan(0);
    });

    staleRows.resolve(paginated([buildFunder({ id: 'funder-3', name: 'Stale Funder' })]));

    await waitFor(() => {
      expect(screen.queryByText('Stale Funder')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Fresh Funder').length).toBeGreaterThan(0);

  });

  it('renders consolidated command center on /grants with tabbed workspace views', async () => {
    apiMocks.listFunders.mockResolvedValue(paginated([buildFunder()]));
    apiMocks.getSummary.mockResolvedValue({
      ...summary,
      draft_applications: 3,
      submitted_applications: 5,
      approved_applications: 2,
      active_awards: 4,
      total_disbursed_amount: 150000,
      outstanding_amount: 50000,
      overdue_reports: 1,
      upcoming_reports: 2,
      upcoming_items: [
        {
          id: 'item-1',
          grant_id: 'grant-1',
          grant_number: 'GR-2026-001',
          grant_title: 'Federal Grant Q3 Report',
          due_at: '2026-06-30',
          item_type: 'report',
          status: 'Upcoming',
          amount: 50000,
          recipient_name: 'Recipient Org',
          program_name: 'Program A',
        },
      ],

    });

    render(
      <MemoryRouter initialEntries={['/grants']}>
        <Routes>
          <Route path="/grants" element={<GrantsPage />} />
          <Route path="/grants/:section" element={<GrantsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('grants-command-center')).toBeInTheDocument();
    });

    expect(screen.getByText('Grants Command Center')).toBeInTheDocument();
    expect(screen.getByText('In-Flight Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Active Awards')).toBeInTheDocument();

    // Verify tabs
    expect(screen.getByRole('button', { name: /pipeline status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upcoming deadlines/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /award disbursements/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compliance & reports/i })).toBeInTheDocument();

    // Switch to Upcoming Deadlines tab
    fireEvent.click(screen.getByRole('button', { name: /upcoming deadlines/i }));
    expect(screen.getByText('Federal Grant Q3 Report')).toBeInTheDocument();

    // Switch to Award Disbursements tab
    fireEvent.click(screen.getByRole('button', { name: /award disbursements/i }));
    expect(screen.getByText(/scheduled disbursement payments pending release/i)).toBeInTheDocument();

    // Switch to Compliance & Reports tab
    fireEvent.click(screen.getByRole('button', { name: /compliance & reports/i }));
    expect(screen.getByText('Overdue Reports')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Reports')).toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/grants/funders']}>
      <Routes>
        <Route path="/grants" element={<GrantsPage />} />
        <Route path="/grants/:section" element={<GrantsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

