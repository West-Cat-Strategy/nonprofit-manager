import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import ContactNotes from '../ContactNotesPanel';
import contactsReducer from '../../state';
import { resetOutcomeDefinitionsCache } from '../../../outcomes/hooks/useOutcomeDefinitions';
import { renderWithProviders } from '../../../../test/testUtils';
import api from '../../../../services/api';

const listOutcomeDefinitionsMock = vi.fn();

const caseItem = {
  id: 'case-1',
  case_number: 'CASE-001',
  contact_id: 'contact-1',
  case_type_id: 'type-1',
  status_id: 'status-1',
  priority: 'medium',
  title: 'Housing support',
  intake_date: '2026-03-01',
  is_urgent: false,
  client_viewable: false,
  requires_followup: false,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
} as const;

const contactCases = [caseItem];

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../state/contactCases', () => ({
  selectContactCasesByContact: () => contactCases,
}));

vi.mock('../../../cases/api/casesApiClient', () => ({
  casesApiClient: {
    listOutcomeDefinitions: (...args: unknown[]) => listOutcomeDefinitionsMock(...args),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const createEnvelope = <T,>(data: T) => ({ data: { success: true as const, data } });
const createTimelineResponse = (items: unknown[] = []) =>
  createEnvelope({
    items,
    counts: {
      all: items.length,
      contact_notes: items.filter(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'source_type' in item &&
          (item as { source_type?: string }).source_type === 'contact_note'
      ).length,
      case_notes: items.filter(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'source_type' in item &&
          (item as { source_type?: string }).source_type === 'case_note'
      ).length,
      event_activity: items.filter(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'source_type' in item &&
          (item as { source_type?: string }).source_type === 'event_activity'
      ).length,
    },
  });

const renderContactNotes = () => {
  const contactsState = contactsReducer(undefined, { type: '@@INIT' });

  return renderWithProviders(<ContactNotes contactId="contact-1" />, {
    preloadedState: {
      contacts: contactsState,
    },
  });
};

describe('ContactNotesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOutcomeDefinitionsCache();
    listOutcomeDefinitionsMock.mockResolvedValue([
      {
        id: 'outcome-1',
        key: 'maintained_employment',
        name: 'Maintained employment',
        description: null,
        category: null,
        is_active: true,
        is_reportable: true,
        sort_order: 10,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mockApi.get.mockResolvedValue(createTimelineResponse());
    mockApi.post.mockResolvedValue(
      createEnvelope({
        id: 'note-1',
        contact_id: 'contact-1',
        case_id: 'case-1',
        note_type: 'note',
        subject: null,
        content: 'Discussed employment',
        is_internal: false,
        is_important: false,
        is_pinned: false,
        is_alert: false,
        is_portal_visible: false,
        portal_visible_at: null,
        portal_visible_by: null,
        attachments: null,
        created_at: '2026-03-14T00:00:00.000Z',
        updated_at: '2026-03-14T00:00:00.000Z',
        created_by: 'user-1',
        outcome_impacts: [
          {
            id: 'impact-1',
            interaction_id: 'note-1',
            outcome_definition_id: 'outcome-1',
            impact: true,
            attribution: 'DIRECT',
            intensity: null,
            evidence_note: null,
            created_by_user_id: 'user-1',
            created_at: '2026-03-14T00:00:00.000Z',
            updated_at: '2026-03-14T00:00:00.000Z',
            outcome_definition: {
              id: 'outcome-1',
              key: 'maintained_employment',
              name: 'Maintained employment',
            },
          },
        ],
      })
    );
  });

  it('shows outcome selection only after a case is chosen and clears it when the case is removed', async () => {
    renderContactNotes();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/v2/contacts/contact-1/notes/timeline');
    });

    fireEvent.click(screen.getByRole('button', { name: /\+ add note/i }));

    expect(screen.queryByText(/discussed outcomes/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/associate with case/i), {
      target: { value: 'case-1' },
    });

    expect(await screen.findByText(/discussed outcomes/i)).toBeInTheDocument();

    const outcomeCheckbox = screen.getByRole('checkbox', { name: /maintained employment/i });
    fireEvent.click(outcomeCheckbox);
    expect(outcomeCheckbox).toBeChecked();

    fireEvent.change(screen.getByLabelText(/associate with case/i), {
      target: { value: '' },
    });

    await waitFor(() => {
      expect(screen.queryByText(/discussed outcomes/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/associate with case/i), {
      target: { value: 'case-1' },
    });

    const resetCheckbox = await screen.findByRole('checkbox', { name: /maintained employment/i });
    expect(resetCheckbox).not.toBeChecked();
  });

  it('renders stable note hooks for case-linked notes and keeps the case link inside the right card', async () => {
    mockApi.get.mockResolvedValueOnce(
      createTimelineResponse([
        {
          id: 'note-linked',
          source_type: 'contact_note',
          note_type: 'note',
          title: null,
          content: 'Linked note',
          case_id: 'case-1',
          case_number: 'CASE-001',
          case_title: 'Housing support',
          event_id: null,
          event_name: null,
          activity_type: null,
          registration_status: null,
          previous_registration_status: null,
          next_registration_status: null,
          checked_in: false,
          check_in_method: null,
          is_internal: false,
          is_important: false,
          is_pinned: false,
          is_alert: false,
          is_portal_visible: false,
          created_at: '2026-03-12T00:00:00.000Z',
          updated_at: '2026-03-12T00:00:00.000Z',
          created_by: 'user-1',
          created_by_first_name: 'Staff',
          created_by_last_name: 'Member',
          outcome_impacts: [],
        },
        {
          id: 'note-other',
          source_type: 'contact_note',
          note_type: 'call',
          title: null,
          content: 'Unlinked note',
          case_id: null,
          case_number: null,
          case_title: null,
          event_id: null,
          event_name: null,
          activity_type: null,
          registration_status: null,
          previous_registration_status: null,
          next_registration_status: null,
          checked_in: false,
          check_in_method: null,
          is_internal: false,
          is_important: false,
          is_pinned: false,
          is_alert: false,
          is_portal_visible: false,
          created_at: '2026-03-11T00:00:00.000Z',
          updated_at: '2026-03-11T00:00:00.000Z',
          created_by: 'user-2',
          created_by_first_name: 'Casey',
          created_by_last_name: 'Worker',
          outcome_impacts: [],
        },
      ])
    );

    renderContactNotes();

    fireEvent.click(screen.getByRole('button', { name: /\+ add note/i }));

    expect(await screen.findByTestId('contact-note-case-select')).toBeInTheDocument();

    const cards = await screen.findAllByTestId('contact-note-card');
    expect(cards).toHaveLength(2);

    const linkedCards = cards.filter((card) => card.getAttribute('data-note-id') === 'note-linked');
    expect(linkedCards).toHaveLength(1);

    const [linkedCard] = linkedCards;
    const linkedCaseLink = within(linkedCard).getByTestId('contact-note-case-link');
    expect(linkedCaseLink).toHaveAttribute('data-note-id', 'note-linked');
    expect(linkedCaseLink).toHaveAttribute('data-case-id', 'case-1');
  });

  it('posts outcome impacts for case-linked notes and renders saved outcome chips', async () => {
    mockApi.get.mockResolvedValueOnce(
      createTimelineResponse([
        {
          id: 'note-existing',
          source_type: 'contact_note',
          note_type: 'note',
          title: null,
          content: 'Existing note',
          case_id: 'case-1',
          case_number: 'CASE-001',
          case_title: 'Housing support',
          event_id: null,
          event_name: null,
          activity_type: null,
          registration_status: null,
          previous_registration_status: null,
          next_registration_status: null,
          checked_in: false,
          check_in_method: null,
          is_internal: false,
          is_important: false,
          is_pinned: false,
          is_alert: false,
          is_portal_visible: false,
          created_at: '2026-03-10T00:00:00.000Z',
          updated_at: '2026-03-10T00:00:00.000Z',
          created_by: 'user-1',
          created_by_first_name: 'Staff',
          created_by_last_name: 'Member',
          outcome_impacts: [
            {
              id: 'impact-existing',
              interaction_id: 'note-existing',
              outcome_definition_id: 'outcome-1',
              impact: true,
              attribution: 'DIRECT',
              intensity: null,
              evidence_note: null,
              created_by_user_id: 'user-1',
              created_at: '2026-03-10T00:00:00.000Z',
              updated_at: '2026-03-10T00:00:00.000Z',
              outcome_definition: {
                id: 'outcome-1',
                key: 'maintained_employment',
                name: 'Maintained employment',
              },
            },
          ],
        },
      ])
    );

    renderContactNotes();

    expect(await screen.findByText('Maintained employment')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /\+ add note/i }));
    fireEvent.change(screen.getByLabelText(/associate with case/i), {
      target: { value: 'case-1' },
    });
    fireEvent.click(await screen.findByRole('checkbox', { name: /maintained employment/i }));
    fireEvent.change(screen.getByLabelText(/content/i), {
      target: { value: 'Discussed employment during follow-up' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add note/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/v2/contacts/contact-1/notes',
        expect.objectContaining({
          case_id: 'case-1',
          outcome_impacts: [
            {
              outcomeDefinitionId: 'outcome-1',
              impact: true,
              attribution: 'DIRECT',
            },
          ],
          outcomes_mode: 'replace',
        })
      );
    });
  });
});
