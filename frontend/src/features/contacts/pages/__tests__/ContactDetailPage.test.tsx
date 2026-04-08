import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ContactDetail from '../ContactDetailPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();

const mockState = {
  contacts: {
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
vi.mock('../../components/ContactNotesPanel', () => ({ default: () => <div>Notes</div> }));
vi.mock('../../../../components/ContactDocuments', () => ({ default: () => <div>Documents</div> }));
vi.mock('../../../../components/ContactTags', () => ({ default: () => <div>Tags</div> }));
vi.mock('../../components/ContactTasksPanel', () => ({ default: () => <div>Tasks Panel</div> }));
vi.mock('../../components/ContactActivityPanel', () => ({ default: () => <div>Activity Panel</div> }));
vi.mock('../../components/ContactCommunicationsPanel', () => ({ default: () => <div>Communications Panel</div> }));
vi.mock('../../components/ContactFollowUpsPanel', () => ({ default: () => <div>Follow-ups Panel</div> }));
vi.mock('../../components/ContactDocumentsPanel', () => ({ default: () => <div>Documents Panel</div> }));
vi.mock('../../components/ContactPaymentsPanel', () => ({ default: () => <div>Payments Panel</div> }));
vi.mock('../../components/ContactMergeDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Merge Dialog</div> : null),
}));

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
    mockState.contacts.currentContact = null;
    mockState.contacts.loading = false;
    mockState.contacts.error = null;
    mockState.contacts.contactNotes = [];
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

  it('renders the communications tab on valid contact routes', async () => {
    mockState.contacts.currentContact = {
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      account_id: null,
      account_name: 'Test Org',
      first_name: 'Taylor',
      preferred_name: null,
      last_name: 'Contact',
      middle_name: null,
      salutation: null,
      suffix: null,
      birth_date: null,
      gender: null,
      pronouns: null,
      phn: null,
      email: null,
      phone: null,
      mobile_phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state_province: null,
      postal_code: null,
      country: null,
      no_fixed_address: false,
      job_title: null,
      department: null,
      preferred_contact_method: null,
      do_not_email: false,
      do_not_phone: false,
      do_not_text: false,
      do_not_voicemail: false,
      notes: null,
      tags: [],
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      phone_count: 0,
      email_count: 0,
      relationship_count: 0,
      note_count: 0,
      roles: ['Client'],
    };

    renderContactDetail('/contacts/550e8400-e29b-41d4-a716-446655440000');

    expect(screen.getByRole('tab', { name: /communications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^communications$/i })).toBeInTheDocument();

    screen.getByRole('tab', { name: /communications/i }).click();
    expect(await screen.findByText('Communications Panel')).toBeInTheDocument();
  });

  it('opens the merge dialog from the contact header', async () => {
    const user = userEvent.setup();
    mockState.contacts.currentContact = {
      contact_id: '550e8400-e29b-41d4-a716-446655440000',
      account_id: null,
      account_name: 'Test Org',
      first_name: 'Taylor',
      preferred_name: null,
      last_name: 'Contact',
      middle_name: null,
      salutation: null,
      suffix: null,
      birth_date: null,
      gender: null,
      pronouns: null,
      phn: null,
      email: null,
      phone: null,
      mobile_phone: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state_province: null,
      postal_code: null,
      country: null,
      no_fixed_address: false,
      job_title: null,
      department: null,
      preferred_contact_method: null,
      do_not_email: false,
      do_not_phone: false,
      do_not_text: false,
      do_not_voicemail: false,
      notes: null,
      tags: [],
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
      phone_count: 0,
      email_count: 0,
      relationship_count: 0,
      note_count: 0,
      roles: ['Client'],
    };

    renderContactDetail('/contacts/550e8400-e29b-41d4-a716-446655440000');

    await user.click(screen.getByRole('button', { name: /merge contact/i }));
    expect(await screen.findByText('Merge Dialog')).toBeInTheDocument();
  });
});
