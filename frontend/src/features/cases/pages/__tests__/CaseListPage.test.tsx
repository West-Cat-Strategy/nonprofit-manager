import { fireEvent, screen } from '@testing-library/react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import type * as ReactRouterDomModule from 'react-router-dom';
import { vi } from 'vitest';
import CaseListPage from '../CaseListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const navigateMock = vi.hoisted(() => vi.fn());
const dispatchMock = vi.hoisted(() => vi.fn());
const validCaseId = '44444444-4444-4444-8444-444444444444';

const mockState = {
  cases: {
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
    caseTypes: [],
    caseStatuses: [],
    selectedCaseIds: [],
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to a case detail route using the canonical case UUID', () => {
    renderWithProviders(<CaseListPage />, { route: '/cases' });

    fireEvent.click(screen.getAllByText('CASE-100')[0]);

    expect(navigateMock).toHaveBeenCalledWith(`/cases/${validCaseId}`);
  });

  it('shows provenance badges and syncs the imported-only filter', () => {
    renderWithProviders(<CaseListPage />, { route: '/cases' });

    expect(screen.getAllByText('Imported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 table').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Show imported cases only'));
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cases/setFilters',
        payload: expect.objectContaining({ imported_only: true }),
      })
    );
  });
});
