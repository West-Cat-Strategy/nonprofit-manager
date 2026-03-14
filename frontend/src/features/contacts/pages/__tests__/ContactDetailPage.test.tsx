import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ContactDetail from '../ContactDetailPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();

const mockState = {
  contactsV2: {
    currentContact: null,
    loading: false,
    error: null,
    contactNotes: [],
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../../features/contacts/state', () => ({
  default: () => ({
    currentContact: null,
    loading: false,
    error: null,
    contactNotes: [],
  }),
  contactsV2Reducer: () => ({
    currentContact: null,
    loading: false,
    error: null,
    contactNotes: [],
  }),
  fetchContactById: (id: string) => ({ type: 'contacts/fetchById', payload: id }),
  clearCurrentContact: () => ({ type: 'contacts/clearCurrent' }),
  fetchContactNotes: (id: string) => ({ type: 'contacts/fetchNotes', payload: id }),
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
  fetchCasesByContact: (id: string) => ({ type: 'cases/fetchByContact', payload: id }),
  selectCasesByContact: () => [],
}));

vi.mock('../../../../components/neo-brutalist', () => ({
  BrutalCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalButton: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  BrutalBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('../../../../components/PaymentHistory', () => ({ default: () => <div>Payments</div> }));
vi.mock('../../../../components/ContactPhoneNumbers', () => ({ default: () => <div>Phones</div> }));
vi.mock('../../../../components/ContactEmailAddresses', () => ({ default: () => <div>Emails</div> }));
vi.mock('../../../../components/ContactRelationships', () => ({ default: () => <div>Relationships</div> }));
vi.mock('../../../../components/ContactNotes', () => ({ default: () => <div>Notes</div> }));
vi.mock('../../../../components/ContactDocuments', () => ({ default: () => <div>Documents</div> }));
vi.mock('../../../../components/ContactTags', () => ({ default: () => <div>Tags</div> }));
vi.mock('../../../../components/ContactTasks', () => ({ default: () => <div>Tasks</div> }));
vi.mock('../../../../components/ContactActivityTimeline', () => ({ default: () => <div>Timeline</div> }));
vi.mock('../../../../components/FollowUpList', () => ({ default: () => <div>Follow-ups</div> }));

function renderContactDetail(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/contacts/:id" element={<ContactDetail />} />
    </Routes>,
    { route }
  );
}

describe('Contact detail route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a local invalid-link state and skips fetches for non-UUID params', () => {
    renderContactDetail('/contacts/not-a-uuid');

    expect(screen.getByRole('heading', { name: /invalid contact link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to people/i })).toBeInTheDocument();
    expect(dispatchMock).not.toHaveBeenCalledWith({
      type: 'contacts/fetchById',
      payload: 'not-a-uuid',
    });
    expect(dispatchMock).not.toHaveBeenCalledWith({
      type: 'cases/fetchByContact',
      payload: 'not-a-uuid',
    });
    expect(dispatchMock).not.toHaveBeenCalledWith({
      type: 'contacts/fetchNotes',
      payload: 'not-a-uuid',
    });
  });
});
