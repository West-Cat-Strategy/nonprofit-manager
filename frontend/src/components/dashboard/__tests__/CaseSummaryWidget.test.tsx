/**
 * CaseSummaryWidget Tests
 * Tests for case management summary widget
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import CaseSummaryWidget from '../CaseSummaryWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import type { CaseWithDetails } from '../../../types/case';
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

const baseCase = (overrides: Partial<CaseWithDetails>): CaseWithDetails => ({
  id: overrides.id ?? 'case-1',
  case_number: 'CASE-001',
  contact_id: 'contact-1',
  case_type_id: 'type-1',
  status_id: 'status-1',
  priority: 'low',
  title: 'Test Case',
  intake_date: '2025-01-01T00:00:00Z',
  is_urgent: false,
  requires_followup: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  status_type: 'active',
  ...overrides,
});

const mockDispatch = vi.fn();
let mockState: { casesV2: { cases: CaseWithDetails[]; loading: boolean; error: string | null } };
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

    mockState = {
      casesV2: {
        cases: [
          baseCase({
            id: 'case-1',
            priority: 'low',
            status_type: 'active',
            due_date: '2025-01-16T12:00:00Z',
            assigned_to: 'user-1',
          }),
          baseCase({
            id: 'case-2',
            priority: 'urgent',
            status_type: 'active',
            is_urgent: true,
            due_date: '2025-01-10T12:00:00Z',
            assigned_to: null,
          }),
          baseCase({
            id: 'case-3',
            priority: 'high',
            status_type: 'review',
            due_date: '2025-01-20T12:00:00Z',
            assigned_to: null,
          }),
          baseCase({
            id: 'case-4',
            priority: 'medium',
            status_type: 'closed',
            due_date: '2025-01-14T12:00:00Z',
            assigned_to: 'user-2',
          }),
        ],
        loading: false,
        error: null,
      },
    };

    (useAppDispatch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockDispatch);
    (useAppSelector as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: MockSelector<unknown>) => selector(mockState)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title and key metrics', () => {
    renderWidget();

    expect(screen.getByText('Case Summary')).toBeInTheDocument();
    expect(screen.getByText('Active Cases')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Due This Week')).toBeInTheDocument();

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('dispatches fetch on mount', () => {
    renderWidget();

    expect(mockDispatch).toHaveBeenCalled();
    expect(mockDispatch.mock.calls[0][0]).toEqual(expect.any(Function));
  });

  it('renders links with correct destinations', () => {
    renderWidget();

    const activeLink = screen.getByText('Active Cases').closest('a');
    const urgentLink = screen.getByText('Urgent').closest('a');

    expect(activeLink).toHaveAttribute('href', '/cases?quick_filter=active');
    expect(urgentLink).toHaveAttribute('href', '/cases?quick_filter=urgent');
  });

  it('shows priority distribution counts', () => {
    renderWidget();

    const prioritySection = screen.getByText('Priority Distribution').closest('div');
    expect(prioritySection).toBeInTheDocument();

    const scope = within(prioritySection as HTMLElement);

    const lowLabel = scope.getByText('Low');
    const mediumLabel = scope.getByText('Med');
    const highLabel = scope.getByText('High');
    const urgentLabel = scope.getByText('Urg');

    expect(lowLabel.previousSibling).toHaveTextContent('1');
    expect(mediumLabel.previousSibling).toHaveTextContent('0');
    expect(highLabel.previousSibling).toHaveTextContent('1');
    expect(urgentLabel.previousSibling).toHaveTextContent('1');
  });

  it('respects loading and error states from store', () => {
    mockState.casesV2.loading = true;
    mockState.casesV2.error = 'Failed to load cases';

    renderWidget();

    expect(screen.getByText('Case Summary')).toBeInTheDocument();
  });
});
