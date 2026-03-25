import { fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import CaseDetail from '../CaseDetailPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn(() => Promise.resolve({ unwrap: () => Promise.resolve({}) }));
const validCaseId = '22222222-2222-4222-8222-222222222222';
const validContactId = '33333333-3333-4333-8333-333333333333';

const mockState = {
  cases: {
    currentCase: {
      id: validCaseId,
      case_number: 'CASE-001',
      title: 'Housing Support',
      is_urgent: false,
      client_viewable: true,
      status_type: 'active',
      status_name: 'Open',
      priority: 'medium',
      case_type_color: '#e5e7eb',
      case_type_name: 'General',
      notes_count: 1,
      documents_count: 2,
      services_count: 0,
      contact_first_name: 'Casey',
      contact_last_name: 'Client',
      contact_email: 'casey@example.com',
      contact_phone: '555-1010',
      description: 'Case details',
      source: 'manual',
      referral_source: null,
      intake_date: '2026-03-01',
      opened_date: null,
      due_date: null,
      closed_date: null,
      assigned_first_name: 'Alex',
      assigned_last_name: 'Rivera',
      tags: [],
      contact_id: validContactId,
    },
    caseStatuses: [],
    caseMilestones: [],
    loading: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      variant: 'info',
    },
    confirm: vi.fn(() => Promise.resolve(true)),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: {
    delete: () => ({ message: 'Delete?', confirmLabel: 'Delete', variant: 'danger' }),
  },
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../../../../components/neo-brutalist', () => ({
  NeoBrutalistLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  BrutalBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('../../components/CaseNotesPanel', () => ({ default: () => <div>Notes panel</div> }));
vi.mock('../../../../components/CaseDocuments', () => ({ default: () => <div>Documents panel</div> }));
vi.mock('../../../../components/FollowUpList', () => ({ default: () => <div>Follow-ups panel</div> }));
vi.mock('../../../../components/cases/CaseRelationships', () => ({ default: () => <div>Relationships panel</div> }));
vi.mock('../../../../components/cases/CaseServices', () => ({ default: () => <div>Services panel</div> }));
vi.mock('../../../../components/cases/CasePortalConversations', () => ({ default: () => <div>Portal panel</div> }));
vi.mock('../../../../components/cases/CaseTimeline', () => ({ default: () => <div>Timeline panel</div> }));
vi.mock('../../../../components/cases/CaseOutcomesTopics', () => ({ default: () => <div>Outcomes panel</div> }));
vi.mock('../../../../components/cases/CaseAppointments', () => ({ default: () => <div>Appointments panel</div> }));
vi.mock('../../../../features/teamChat/components/CaseTeamChatPanel', () => ({ default: () => <div>Team chat</div> }));
vi.mock('../../../../features/cases/components/CaseStatusChangeModal', () => ({ default: () => null }));

vi.mock('../../../../features/cases/state', () => ({
  default: (
    state = {
      currentCase: null,
      cases: [],
      caseStatuses: [],
      caseMilestones: [],
      loading: false,
      error: null,
    }
  ) => state,
  fetchCaseById: (id: string) => ({ type: 'case/fetchById', payload: id }),
  updateCase: (payload: unknown) => ({ type: 'case/update', payload }),
  updateCaseStatus: (payload: unknown) => ({ type: 'case/updateStatus', payload }),
  deleteCase: (id: string) => ({ type: 'case/delete', payload: id }),
  clearCurrentCase: () => ({ type: 'case/clearCurrent' }),
  fetchCaseStatuses: () => ({ type: 'case/fetchStatuses' }),
  fetchCaseMilestones: (id: string) => ({ type: 'case/fetchMilestones', payload: id }),
  fetchCaseOutcomeDefinitions: (includeInactive?: boolean) => ({
    type: 'case/fetchOutcomeDefinitions',
    payload: includeInactive,
  }),
  createCaseMilestone: (payload: unknown) => ({ type: 'case/createMilestone', payload }),
  updateCaseMilestone: (payload: unknown) => ({ type: 'case/updateMilestone', payload }),
  deleteCaseMilestone: (id: string) => ({ type: 'case/deleteMilestone', payload: id }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderCaseDetail(route: string) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/cases/:id"
        element={
          <>
            <CaseDetail />
            <LocationProbe />
          </>
        }
      />
    </Routes>,
    { route }
  );
}

describe('Case detail tabs URL sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates selected tab from query string', () => {
    renderCaseDetail(`/cases/${validCaseId}?tab=notes`);

    expect(screen.getByRole('tab', { name: /notes/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location-search')).toHaveTextContent('tab=notes');
  });

  it('updates query string when switching tabs', () => {
    renderCaseDetail(`/cases/${validCaseId}`);

    fireEvent.click(screen.getByRole('tab', { name: /documents/i }));

    expect(screen.getByRole('tab', { name: /documents/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location-search')).toHaveTextContent('tab=documents');
  });

  it('renders a local invalid-link state and skips case fetches for non-UUID params', () => {
    renderCaseDetail('/cases/not-a-uuid');

    expect(screen.getByRole('heading', { name: /invalid case link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to cases/i })).toBeInTheDocument();
    expect(dispatchMock).not.toHaveBeenCalledWith({
      type: 'case/fetchById',
      payload: 'not-a-uuid',
    });
    expect(dispatchMock).not.toHaveBeenCalledWith({
      type: 'case/fetchMilestones',
      payload: 'not-a-uuid',
    });
  });
});
