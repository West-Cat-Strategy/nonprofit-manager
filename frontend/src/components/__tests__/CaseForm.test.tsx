import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaseForm from '../CaseForm';
import { createTestStore, renderWithProviders } from '../../test/testUtils';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const navigateMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

describe('CaseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/v2/cases/types') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: 'case-type-1',
                name: 'Housing Support',
                description: 'Housing stabilization',
              },
            ],
          },
        });
      }

      if (url === '/v2/cases/statuses') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }

      if (url === '/v2/contacts/contact-1') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              contact_id: 'contact-1',
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
            },
          },
        });
      }

      if (url === '/users?is_active=true') {
        return Promise.resolve({ data: { users: [] } });
      }

      return Promise.resolve({ data: { success: true, data: [] } });
    });
    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'case-1',
          case_number: 'CASE-001',
          contact_id: 'contact-1',
          case_type_id: 'case-type-1',
          case_type_ids: ['case-type-1'],
          status_id: 'status-intake',
          priority: 'high',
          title: 'Emergency housing support',
          description: 'Needs support this week.',
          intake_date: '2026-05-13',
          is_urgent: true,
          client_viewable: false,
          requires_followup: false,
          created_at: '2026-05-13T12:00:00.000Z',
          updated_at: '2026-05-13T12:00:00.000Z',
        },
      },
    });
  });

  it('submits a new case through the v2 API and navigates after save', async () => {
    const user = userEvent.setup();
    const baseState = createTestStore().getState();
    const store = createTestStore({
      ...baseState,
      cases: {
        ...baseState.cases,
        core: {
          ...baseState.cases.core,
          contactCasesByContactId: {
            'contact-1': {
              cases: [],
              loading: false,
              error: 'stale error',
              fetchedAt: 123,
            },
          },
        },
      },
    });

    renderWithProviders(
      <CaseForm initialData={{ contact_id: 'contact-1' }} disableContactSelection />,
      { store }
    );

    expect(await screen.findByDisplayValue(/ada lovelace/i)).toBeInTheDocument();
    await user.click(await screen.findByRole('checkbox', { name: /housing support/i }));
    await user.type(screen.getByLabelText(/title/i), 'Emergency housing support');
    fireEvent.change(screen.getByLabelText(/priority/i), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText(/source/i), { target: { value: 'referral' } });
    await user.type(screen.getByLabelText(/referral source/i), 'Community Partner');
    await user.type(screen.getByLabelText(/description/i), 'Needs support this week.');
    await user.click(screen.getByLabelText(/mark as urgent/i));
    await user.type(screen.getByLabelText(/tags/i), 'housing');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await user.click(screen.getByTestId('case-form-primary-submit'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/v2/cases',
        expect.objectContaining({
          contact_id: 'contact-1',
          case_type_id: 'case-type-1',
          case_type_ids: ['case-type-1'],
          title: 'Emergency housing support',
          description: 'Needs support this week.',
          priority: 'high',
          source: 'referral',
          referral_source: 'Community Partner',
          is_urgent: true,
          tags: ['housing'],
        })
      );
    });
    expect(showSuccessMock).toHaveBeenCalledWith('Case created successfully');
    expect(store.getState().cases.core.contactCasesByContactId['contact-1']).toEqual(
      expect.objectContaining({
        cases: [expect.objectContaining({ id: 'case-1', contact_id: 'contact-1' })],
        error: null,
        fetchedAt: null,
      })
    );
    expect(navigateMock).toHaveBeenCalledWith('/cases');
  });

  it('calls onCreated with the saved case instead of navigating when embedded in intake', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    renderWithProviders(
      <CaseForm
        initialData={{
          contact_id: 'contact-1',
          case_type_id: 'case-type-1',
          case_type_ids: ['case-type-1'],
        }}
        disableContactSelection
        onCreated={onCreated}
      />
    );

    expect(await screen.findByDisplayValue(/ada lovelace/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/title/i), 'Intake housing case');

    await user.click(screen.getByTestId('case-form-primary-submit'));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'case-1',
          contact_id: 'contact-1',
        })
      );
    });
    expect(showSuccessMock).toHaveBeenCalledWith('Case created successfully');
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
