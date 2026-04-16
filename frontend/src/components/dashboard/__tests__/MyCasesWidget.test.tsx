/**
 * MyCasesWidget Tests
 * Tests for the assigned cases dashboard widget
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import MyCasesWidget from '../MyCasesWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import type { CaseWithDetails } from '../../../types/case';
import { useAppSelector } from '../../../store/hooks';
import { casesApiClient } from '../../../features/cases/api/casesApiClient';

vi.mock('../../../store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

vi.mock('../../../features/cases/api/casesApiClient', () => ({
  casesApiClient: {
    listCases: vi.fn(),
  },
}));

const mockedUseAppSelector = useAppSelector as unknown as ReturnType<typeof vi.fn>;
const mockedCasesApiClient = casesApiClient as unknown as {
  listCases: ReturnType<typeof vi.fn>;
};

const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const mockWidget: DashboardWidget = {
  id: 'my-cases-1',
  type: 'my_cases',
  title: 'My Cases',
  position: { x: 0, y: 0, w: 1, h: 1 },
  config: {},
};

const mockUser = {
  id: 'user-1',
  email: 'agent@example.org',
  firstName: 'Avery',
  lastName: 'Agent',
  role: 'manager',
};

const createCase = (overrides: Partial<CaseWithDetails>): CaseWithDetails =>
  ({
    id: 'case-1',
    case_number: 'CASE-001',
    contact_id: 'contact-1',
    case_type_id: 'type-1',
    status_id: 'status-1',
    priority: 'medium',
    title: 'Assigned Case',
    intake_date: '2026-01-01T00:00:00.000Z',
    due_date: '2099-01-01T00:00:00.000Z',
    assigned_to: mockUser.id,
    is_urgent: false,
    client_viewable: true,
    requires_followup: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as CaseWithDetails;

const renderWidget = () =>
  render(
    <RouterWrapper>
      <MyCasesWidget widget={mockWidget} editMode={false} onRemove={() => {}} />
    </RouterWrapper>
  );

describe('MyCasesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseAppSelector.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        auth: {
          user: mockUser,
          authLoading: false,
        },
      })
    );
  });

  it("fetches only the current user's cases and shows the assigned cases link", async () => {
    mockedCasesApiClient.listCases.mockResolvedValue({
      cases: [
        createCase({ id: 'case-2', case_number: 'CASE-002', title: 'Later Case', due_date: '2099-02-01T00:00:00.000Z' }),
        createCase({ id: 'case-1', case_number: 'CASE-001', title: 'Sooner Case', due_date: '2099-01-01T00:00:00.000Z' }),
      ],
      total: 7,
      pagination: {
        page: 1,
        limit: 5,
      },
    });

    renderWidget();

    await waitFor(() => {
      expect(mockedCasesApiClient.listCases).toHaveBeenCalledWith({
        assignedTo: mockUser.id,
        page: 1,
        limit: 5,
        sortBy: 'due_date',
        sortOrder: 'asc',
      });
    });

    expect(await screen.findByText('Sooner Case')).toBeInTheDocument();
    expect(screen.getByText('Later Case')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View all 7 assigned cases/i })).toHaveAttribute(
      'href',
      `/cases?assigned_to=${mockUser.id}`
    );
  });

  it('shows the empty state when no assigned cases are returned', async () => {
    mockedCasesApiClient.listCases.mockResolvedValue({
      cases: [],
      total: 0,
      pagination: {
        page: 1,
        limit: 5,
      },
    });

    renderWidget();

    expect(await screen.findByText('No cases assigned to you')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create New Case/i })).toHaveAttribute('href', '/cases/new');
  });

  it('shows loading while the assigned-case request is in flight', () => {
    mockedCasesApiClient.listCases.mockReturnValue(new Promise(() => {}) as never);

    renderWidget();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
