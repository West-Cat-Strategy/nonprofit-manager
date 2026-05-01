import { act, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, vi } from 'vitest';
import ContactDetail from '../ContactDetailPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const contactCases = [];

const mockState = {
  contacts: {
    core: {
      currentContact: null,
      loading: false,
      error: null,
    },
    notes: {
      contactNotes: [],
      notesLoading: false,
    },
    list: {
      contacts: [],
      loading: false,
    },
  },
};

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly callback: IntersectionObserverCallback;
  readonly observedElements = new Set<Element>();
  root: Element | null = null;
  rootMargin = '0px';
  thresholds: number[] = [0];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = (element: Element) => {
    this.observedElements.add(element);
  };

  disconnect = () => {
    this.observedElements.clear();
  };

  unobserve = (element: Element) => {
    this.observedElements.delete(element);
  };

  takeRecords = () => [];
}

function emitStickyTitleIntersection(isIntersecting: boolean) {
  act(() => {
    MockIntersectionObserver.instances.forEach((observer) => {
      const entries = Array.from(observer.observedElements, (target) => ({
        isIntersecting,
        target,
        intersectionRatio: isIntersecting ? 1 : 0,
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRect: target.getBoundingClientRect(),
        rootBounds: null,
        time: Date.now(),
      } as IntersectionObserverEntry));

      if (entries.length > 0) {
        observer.callback(entries, observer as unknown as IntersectionObserver);
      }
    });
  });
}

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

vi.mock('../../../../features/contacts/state/contactCases', () => ({
  fetchContactCasesByContact: (id: string) => ({ type: 'contacts/fetchCasesByContact', payload: id }),
  selectContactCasesByContact: () => contactCases,
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
vi.mock('../../components/ContactPhoneNumbers', () => ({ default: () => <div>Phones</div> }));
vi.mock('../../components/ContactEmailAddresses', () => ({ default: () => <div>Emails</div> }));
vi.mock('../../components/ContactRelationships', () => ({ default: () => <div>Relationships</div> }));
vi.mock('../../components/ContactNotesPanel', () => ({ default: () => <div>Notes</div> }));
vi.mock('../../components/ContactTags', () => ({ default: () => <div>Tags</div> }));
vi.mock('../../components/ContactTasksPanel', () => ({ default: () => <div>Tasks Panel</div> }));
vi.mock('../../components/ContactActivityPanel', () => ({ default: () => <div>Activity Panel</div> }));
vi.mock('../../components/ContactCommunicationsPanel', () => ({ default: () => <div>Communications Panel</div> }));
vi.mock('../../components/ContactSuppressionPanel', () => ({ default: () => <div>Suppression Panel</div> }));
vi.mock('../../components/ContactFollowUpsPanel', () => ({ default: () => <div>Follow-ups Panel</div> }));
vi.mock('../../components/ContactDocumentsPanel', () => ({ default: () => <div>Documents Panel</div> }));
vi.mock('../../components/ContactPaymentsPanel', () => ({ default: () => <div>Payments Panel</div> }));
vi.mock('../../components/ContactDonorPreferencesPanel', () => ({
  default: () => <div>Donor Preferences Panel</div>,
}));
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
  beforeAll(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver as unknown as typeof IntersectionObserver
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.instances = [];
    mockState.contacts.core.currentContact = null;
    mockState.contacts.core.loading = false;
    mockState.contacts.core.error = null;
    mockState.contacts.notes.contactNotes = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
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
      type: 'contacts/fetchCasesByContact',
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

  it('shows a floating contact header after the main title scrolls away', () => {
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

    expect(screen.queryByRole('region', { name: /current contact header/i })).not.toBeInTheDocument();

    emitStickyTitleIntersection(false);

    const floatingHeader = screen.getByRole('region', { name: /current contact header/i });
    expect(within(floatingHeader).getByText('Taylor Contact')).toBeInTheDocument();

    emitStickyTitleIntersection(true);

    expect(screen.queryByRole('region', { name: /current contact header/i })).not.toBeInTheDocument();
  });

  it('opens the print export in a new tab from the contact header', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
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

    await user.click(screen.getByRole('button', { name: /print \/ export/i }));

    expect(openSpy).toHaveBeenCalledWith(
      '/contacts/550e8400-e29b-41d4-a716-446655440000/print',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
