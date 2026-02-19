import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ReportBuilder from '../../analytics/ReportBuilder';
import { renderWithProviders } from '../../../test/testUtils';

const dispatchMock = vi.fn(() => Promise.resolve());
const mockState = {
  reports: { currentReport: null, loading: false, availableFields: [] },
  savedReports: { currentSavedReport: null },
};

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: any) => any) => selector(mockState),
}));

vi.mock('../../../store/slices/reportsSlice', async () => {
  const actual = await vi.importActual<any>('../../../store/slices/reportsSlice');
  return {
    ...actual,
    default: (state = { currentReport: null, loading: false, availableFields: [] }) => state,
    generateReport: (payload: any) => ({ type: 'reports/generate', payload }),
  };
});
vi.mock('../../../store/slices/savedReportsSlice', async () => {
  const actual = await vi.importActual<any>('../../../store/slices/savedReportsSlice');
  return {
    ...actual,
    default: (state = { currentSavedReport: null }) => state,
    createSavedReport: (payload: any) => ({ type: 'saved/create', payload }),
    fetchSavedReportById: (id: string) => ({ type: 'saved/fetchById', payload: id }),
  };
});
vi.mock('../../../components/FieldSelector', () => ({ default: () => <div>Field Selector</div> }));
vi.mock('../../../components/FilterBuilder', () => ({ default: () => <div>Filter Builder</div> }));
vi.mock('../../../components/SortBuilder', () => ({ default: () => <div>Sort Builder</div> }));
vi.mock('../../../components/ReportChart', () => ({ default: () => <div>Report Chart</div> }));
vi.mock('../../../components/neo-brutalist/NeoBrutalistLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

describe('ReportBuilder page', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    dispatchMock.mockClear();
  });

  it('renders report builder title', () => {
    renderWithProviders(<ReportBuilder />);
    expect(screen.getByRole('heading', { name: /report builder/i })).toBeInTheDocument();
  });

  it('requires fields before generating report', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />);
    await user.click(screen.getByRole('button', { name: /generate report/i }));
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reports/generate' })
    );
  });
});
