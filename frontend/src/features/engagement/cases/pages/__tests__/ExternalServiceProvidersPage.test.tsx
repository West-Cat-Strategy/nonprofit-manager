import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import api from '../../../../../services/api';
import ExternalServiceProvidersPage from '../ExternalServiceProvidersPage';

vi.mock('../../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../../../components/neo-brutalist', () => ({
  NeoBrutalistLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalBadge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  BrutalButton: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('../../../../../components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../../../../../hooks/useConfirmDialog', () => ({
  __esModule: true,
  default: () => ({
    dialogState: {},
    confirm: vi.fn(),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: {
    delete: () => ({}),
  },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('ExternalServiceProvidersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads providers and renders the provider directory summary', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        providers: [
          {
            id: 'provider-1',
            provider_name: 'Westside Legal',
            provider_type: 'legal',
            notes: 'Walk-in legal advocacy',
            is_active: true,
            attached_cases_count: 2,
            attached_services_count: 3,
          },
        ],
      },
    });

    renderPage();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/external-service-providers', {
        params: {
          search: undefined,
          include_inactive: true,
          limit: 200,
        },
      });
    });

    expect(screen.getByRole('heading', { name: /external service providers/i })).toBeInTheDocument();
    expect(screen.getByText('Westside Legal')).toBeInTheDocument();
    expect(screen.getByText(/walk-in legal advocacy/i)).toBeInTheDocument();
    expect(screen.getByText(/attached to 2 case\(s\) \/ 3 service log\(s\)/i)).toBeInTheDocument();
  });

  it('creates a provider and refreshes the list', async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          providers: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          providers: [
            {
              id: 'provider-2',
              provider_name: 'Harbor Housing',
              provider_type: 'housing',
              notes: 'Rapid placement support',
              is_active: true,
              attached_cases_count: 0,
              attached_services_count: 0,
            },
          ],
        },
      });
    mockApi.post.mockResolvedValueOnce({
      data: { id: 'provider-2' },
    });

    renderPage();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText(/provider name/i), {
      target: { value: 'Harbor Housing' },
    });
    fireEvent.change(screen.getByLabelText(/provider type\/specialty/i), {
      target: { value: 'housing' },
    });
    fireEvent.change(screen.getByLabelText(/^notes$/i), {
      target: { value: 'Rapid placement support' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create provider/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/external-service-providers', {
        provider_name: 'Harbor Housing',
        provider_type: 'housing',
        notes: 'Rapid placement support',
        is_active: true,
      });
    });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('Harbor Housing')).toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ExternalServiceProvidersPage />
    </MemoryRouter>
  );
}
