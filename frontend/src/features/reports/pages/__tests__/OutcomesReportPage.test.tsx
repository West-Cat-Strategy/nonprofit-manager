import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import OutcomesReportPage from '../OutcomesReportPage';

const dispatchMock = vi.fn();

const mockState = {
  outcomesReports: {
    report: {
      totalsByOutcome: [],
      timeseries: [],
    },
    loading: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../outcomes/state', () => ({
  fetchOutcomesReport: (filters: unknown) => ({
    type: 'outcomes/fetchOutcomesReport',
    payload: filters,
  }),
}));

describe('OutcomesReportPage', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('includes the Other interaction type filter option', () => {
    render(<OutcomesReportPage />);

    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
  });
});
