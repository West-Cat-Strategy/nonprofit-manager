/**
 * CaseSummaryWidget Tests
 * Tests for case management summary widget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import CaseSummaryWidget from '../CaseSummaryWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));

const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const mockWidget: DashboardWidget = {
  id: 'case-summary-1',
  type: 'case_summary',
  title: 'Case Summary',
  position: { x: 0, y: 0, w: 1, h: 1 },
  config: {},
};

const mockSummary = {
  total_cases: 12,
  open_cases: 8,
  closed_cases: 4,
  by_priority: {
    low: 2,
    medium: 3,
    high: 1,
    urgent: 2,
  },
  by_status_type: {
    intake: 1,
    active: 4,
    review: 3,
    closed: 4,
    cancelled: 0,
  },
  by_case_type: {
    Housing: 4,
    Legal: 2,
  },
  by_case_outcome: {
    attended_event: 3,
    additional_related_case: 1,
  },
  average_case_duration_days: 6,
  cases_due_this_week: 5,
  overdue_cases: 2,
  unassigned_cases: 1,
};

const mockDispatch = vi.fn();
let mockState: { cases: { summary: typeof mockSummary | null } };
type MockSelector<T> = (state: typeof mockState) => T;

const renderWidget = () =>
  render(
    <RouterWrapper>
      <CaseSummaryWidget widget={mockWidget} editMode={false} onRemove={() => {}} />
    </RouterWrapper>
  );

describe('CaseSummaryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      cases: {
        summary: mockSummary,
      },
    };

    (useAppDispatch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockDispatch);
    (useAppSelector as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: MockSelector<unknown>) => selector(mockState)
    );
  });

  it('renders title and summary metrics', () => {
    renderWidget();

    expect(screen.getByText('Case Summary')).toBeInTheDocument();
    expect(screen.getByText('Active Cases').closest('a')).toHaveTextContent('8');
    expect(screen.getByText('Urgent').closest('a')).toHaveTextContent('2');
    expect(screen.getByText('Due This Week').parentElement).toHaveTextContent('5');
    expect(screen.getByText('Unassigned').closest('a')).toHaveTextContent('1');
    expect(screen.getByText('Overdue').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Low').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Med').parentElement).toHaveTextContent('3');
    expect(screen.getByText('High').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Urg').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Attended Event').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Additional Related Case').parentElement).toHaveTextContent('1');
  });

  it('dispatches the summary thunk on mount', () => {
    renderWidget();

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0][0]).toEqual(expect.any(Function));
  });

  it('renders links with correct destinations', () => {
    renderWidget();

    const activeLink = screen.getByText('Active Cases').closest('a');
    const urgentLink = screen.getByText('Urgent').closest('a');

    expect(activeLink).toHaveAttribute('href', '/cases?quick_filter=active');
    expect(urgentLink).toHaveAttribute('href', '/cases?quick_filter=urgent');
  });

  it('shows loading while the summary fetch is unresolved', () => {
    mockState.cases.summary = null;
    mockDispatch.mockReturnValue(new Promise(() => {}) as never);

    renderWidget();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
