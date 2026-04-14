import { fireEvent, screen, waitFor } from '@testing-library/react';
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
    mockApi.get.mockResolvedValue(createEnvelope({ notes: [], total: 0 }));
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
      expect(mockApi.get).toHaveBeenCalledWith('/v2/contacts/contact-1/notes');
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

  it('posts outcome impacts for case-linked notes and renders saved outcome chips', async () => {
    mockApi.get.mockResolvedValueOnce(
      createEnvelope({
        notes: [
          {
            id: 'note-existing',
            contact_id: 'contact-1',
            case_id: 'case-1',
            note_type: 'note',
            subject: null,
            content: 'Existing note',
            is_internal: false,
            is_important: false,
            is_pinned: false,
            is_alert: false,
            is_portal_visible: false,
            portal_visible_at: null,
            portal_visible_by: null,
            attachments: null,
            created_at: '2026-03-10T00:00:00.000Z',
            updated_at: '2026-03-10T00:00:00.000Z',
            created_by: 'user-1',
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
        ],
        total: 1,
      })
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
