import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
<<<<<<< HEAD
import InteractionNote from '../../../features/workflows/pages/InteractionNotePage';
=======
import InteractionNote from '../InteractionNote';
>>>>>>> origin/main
import casesReducer from '../../../features/cases/state';
import { resetOutcomeDefinitionsCache } from '../../../features/outcomes/hooks/useOutcomeDefinitions';
import { renderWithProviders } from '../../../test/testUtils';
import api from '../../../services/api';

const listOutcomeDefinitionsMock = vi.fn();
const selectResultMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../features/cases/api/casesApiClient', () => ({
  casesApiClient: {
    listOutcomeDefinitions: (...args: unknown[]) => listOutcomeDefinitionsMock(...args),
  },
}));

vi.mock('../../../components/dashboard', () => ({
  useQuickLookup: () => ({
    searchTerm: 'Jane',
    results: [
      {
        contact_id: 'contact-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
      },
    ],
    isOpen: true,
    isLoading: false,
    inputRef: { current: null },
    dropdownRef: { current: null },
    handleSearchChange: vi.fn(),
    handleFocus: vi.fn(),
    selectResult: selectResultMock,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const createEnvelope = <T,>(data: T) => ({ data: { success: true as const, data } });
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

describe('InteractionNote', () => {
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
    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/v2/cases?')) {
        return Promise.resolve(
          createEnvelope({
            cases: [
              {
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
              },
            ],
            total: 1,
          })
        );
      }

      return Promise.resolve(createEnvelope([]));
    });
    mockApi.post.mockResolvedValue(
      createEnvelope({
        id: 'note-1',
        contact_id: 'contact-1',
        case_id: 'case-1',
        note_type: 'note',
        content: 'Met with Jane',
      })
    );
  });

  it('reveals outcome tags only for case-linked notes and submits the selected outcomes', async () => {
    const casesState = casesReducer(undefined, { type: '@@INIT' });

    renderWithProviders(<InteractionNote />, {
      preloadedState: {
        cases: {
          ...casesState,
          cases: [caseItem],
          contactCasesByContactId: {
            'contact-1': {
              cases: [caseItem],
              loading: false,
              error: null,
              fetchedAt: Date.now(),
            },
          },
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /jane doe/i }));

    expect(screen.queryByText(/discussed outcomes/i)).not.toBeInTheDocument();

    const caseSelect = await screen.findByLabelText(/associate with case/i);
    fireEvent.change(caseSelect, { target: { value: 'case-1' } });

    expect(await screen.findByText(/discussed outcomes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /maintained employment/i }));
    fireEvent.change(screen.getByLabelText(/interaction details/i), {
      target: { value: 'Met with Jane and discussed work stabilization.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

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

    expect(navigateMock).toHaveBeenCalledWith('/contacts/contact-1');
  });
});
