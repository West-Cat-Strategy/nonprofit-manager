import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as ReportsSliceModule from '../../state';
import type * as SavedReportsSliceModule from '../../../savedReports/state';
import { vi } from 'vitest';
import ReportBuilder from '../ReportBuilderPage';
import { renderWithProviders } from '../../../../test/testUtils';

const { dispatchMock, instantiateTemplateMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(() => Promise.resolve()),
  instantiateTemplateMock: vi.fn(),
}));

const mockState = {
  reports: {
    currentReport: null,
    loading: false,
    availableFields: {
      accounts: [{ field: 'name', label: 'Name', type: 'string' }],
      contacts: [{ field: 'email', label: 'Email', type: 'string' }],
      donations: [],
      events: [],
      volunteers: [],
      tasks: [],
      cases: [],
      opportunities: [],
      expenses: [],
      grants: [],
      programs: [],
    },
  },
  savedReports: { currentSavedReport: null as null | {
    id: string;
    name: string;
    description?: string;
    entity: 'contacts' | 'accounts';
    report_definition: {
      name: string;
      entity: 'contacts' | 'accounts';
      fields?: string[];
      filters?: [];
      sort?: [];
      groupBy?: string[];
      aggregations?: [];
      limit?: number;
    };
  } },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../api/reportsApiClient', () => ({
  reportsApiClient: {
    instantiateTemplate: (templateId: string) => instantiateTemplateMock(templateId),
    exportReport: vi.fn(() => Promise.resolve(new Uint8Array())),
  },
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof ReportsSliceModule>(
    '../../state'
  );
  return {
    ...actual,
    default: (state = { currentReport: null, loading: false, availableFields: [] }) => state,
    generateReport: (payload: unknown) => ({ type: 'reports/generate', payload }),
  };
});
vi.mock('../../../savedReports/state', async () => {
  const actual = await vi.importActual<typeof SavedReportsSliceModule>(
    '../../../savedReports/state'
  );
  return {
    ...actual,
    default: (state = { currentSavedReport: null }) => state,
    createSavedReport: (payload: unknown) => ({ type: 'saved/create', payload }),
    fetchSavedReportById: (id: string) => ({ type: 'saved/fetchById', payload: id }),
  };
});
vi.mock('../../../../components/FieldSelector', () => ({ default: () => <div>Field Selector</div> }));
vi.mock('../../../../components/FilterBuilder', () => ({ default: () => <div>Filter Builder</div> }));
vi.mock('../../../../components/SortBuilder', () => ({ default: () => <div>Sort Builder</div> }));
vi.mock('../../../../components/ReportChart', () => ({ default: () => <div>Report Chart</div> }));
vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

describe('ReportBuilder page', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    dispatchMock.mockClear();
    instantiateTemplateMock.mockReset();
    mockState.savedReports.currentSavedReport = null;
  });

  it('renders report builder title', () => {
    renderWithProviders(<ReportBuilder />);
    expect(screen.getByRole('heading', { name: /report builder/i })).toBeInTheDocument();
  });

  it('shows opportunities entity and templates shortcut', () => {
    renderWithProviders(<ReportBuilder />);
    expect(screen.getByRole('button', { name: /opportunities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kpi templates/i })).toBeInTheDocument();
  });

  it('requires fields before generating report', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />);
    await user.click(screen.getByRole('button', { name: /generate report/i }));
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reports/generate' })
    );
  });

  it('dispatches saved report fetch when load query param is present', async () => {
    renderWithProviders(<ReportBuilder />, { route: '/reports/builder?load=saved-123' });
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'saved/fetchById', payload: 'saved-123' })
    );
  });

  it('loads template from query param and generates report from template fields', async () => {
    instantiateTemplateMock.mockResolvedValue({
      name: 'Accounts Template',
      entity: 'accounts',
      fields: ['name'],
      filters: [],
      sort: [],
      groupBy: ['name'],
      aggregations: [],
      limit: 150,
    });

    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />, { route: '/reports/builder?template=tpl-1' });

    expect(instantiateTemplateMock).toHaveBeenCalledWith('tpl-1');

    await user.click(screen.getByRole('button', { name: /generate report/i }));
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reports/generate',
        payload: expect.objectContaining({
          entity: 'accounts',
          fields: ['name'],
          groupBy: ['name'],
          limit: 150,
        }),
      })
    );
  });

  it('shows alert when template loading fails', async () => {
    instantiateTemplateMock.mockRejectedValue(new Error('fail'));
    renderWithProviders(<ReportBuilder />, { route: '/reports/builder?template=tpl-fail' });
    await Promise.resolve();
    expect(window.alert).toHaveBeenCalledWith('Failed to load template');
  });

  it('validates report name before saving and then saves successfully', async () => {
    mockState.savedReports.currentSavedReport = {
      id: 'saved-1',
      name: 'Existing Name',
      entity: 'contacts',
      report_definition: {
        name: 'Existing Name',
        entity: 'contacts',
        fields: ['email'],
      },
    };

    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />);

    await user.click(screen.getByRole('button', { name: /save definition/i }));
    const reportNameField = screen.getByLabelText(/report name/i);
    await user.clear(reportNameField);
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(window.alert).toHaveBeenCalledWith('Please enter a report name');

    await user.type(reportNameField, 'Monthly Contact Snapshot');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'saved/create',
        payload: expect.objectContaining({
          name: 'Monthly Contact Snapshot',
          entity: 'contacts',
        }),
      })
    );
  });
});
