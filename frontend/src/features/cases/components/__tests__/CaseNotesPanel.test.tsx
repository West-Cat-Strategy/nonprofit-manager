import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CaseNotes from '../CaseNotesPanel';
import { resetOutcomeDefinitionsCache } from '../../../outcomes/hooks/useOutcomeDefinitions';
import { renderWithProviders } from '../../../../test/testUtils';

const listCaseNotesMock = vi.fn();
const listOutcomeDefinitionsMock = vi.fn();
const createCaseNoteMock = vi.fn();

vi.mock('../../api/casesApiClient', () => ({
  casesApiClient: {
    listCaseNotes: (...args: unknown[]) => listCaseNotesMock(...args),
    listOutcomeDefinitions: (...args: unknown[]) => listOutcomeDefinitionsMock(...args),
    createCaseNote: (...args: unknown[]) => createCaseNoteMock(...args),
    updateCaseNote: vi.fn(),
    deleteCaseNote: vi.fn(),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

describe('CaseNotesPanel component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOutcomeDefinitionsCache();
    listCaseNotesMock.mockResolvedValue({ notes: [] });
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
    createCaseNoteMock.mockResolvedValue({ id: 'note-1' });
  });

  it('creates new notes as internal by default', async () => {
    renderWithProviders(<CaseNotes caseId="case-123" />);

    await waitFor(() => {
      expect(listCaseNotesMock).toHaveBeenCalledWith('case-123');
    });

    fireEvent.click(screen.getByRole('button', { name: /add note/i }));
    fireEvent.change(screen.getByPlaceholderText(/write note details/i), {
      target: { value: 'Progress update for client' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => {
      expect(createCaseNoteMock).toHaveBeenCalled();
    });

    const payload = createCaseNoteMock.mock.calls.at(-1)?.[0];
    expect(payload).toMatchObject({
      case_id: 'case-123',
      visible_to_client: false,
      is_internal: true,
    });
  });

  it('allows staff to mark a note visible to client', async () => {
    renderWithProviders(<CaseNotes caseId="case-123" />);

    await waitFor(() => {
      expect(listCaseNotesMock).toHaveBeenCalledWith('case-123');
    });

    fireEvent.click(screen.getByRole('button', { name: /add note/i }));
    fireEvent.change(screen.getByPlaceholderText(/write note details/i), {
      target: { value: 'Client-facing update' },
    });
    fireEvent.click(screen.getByLabelText(/visible to client/i));
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() => {
      expect(createCaseNoteMock).toHaveBeenCalled();
    });

    const payload = createCaseNoteMock.mock.calls.at(-1)?.[0];
    expect(payload).toMatchObject({
      case_id: 'case-123',
      visible_to_client: true,
      is_internal: false,
    });
  });
});
