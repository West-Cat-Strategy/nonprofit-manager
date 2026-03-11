import type { ComponentType } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../test/testUtils';

let AdminSettings: ComponentType;

const { mockNavigate, mockedApi, mockSetBranding } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetBranding: vi.fn(),
  mockedApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = (await vi.importActual('react-router-dom')) as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../services/api', () => ({
  default: mockedApi,
}));

vi.mock('../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

vi.mock('../../../contexts/BrandingContext', () => ({
  useBranding: () => ({ setBranding: mockSetBranding }),
}));

vi.mock('../../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

const renderAdminSettings = (route = '/settings/admin/organization') =>
  renderWithProviders(
    <Routes>
      <Route path="/settings/admin/:section" element={<AdminSettings />} />
    </Routes>,
    { route }
  );

const countGetCalls = (path: string): number =>
  mockedApi.get.mock.calls.filter(([url]) => url === path).length;

describe('AdminSettings organization section', () => {
  beforeAll(async () => {
    AdminSettings = (await import('../../admin/AdminSettings')).default;
  });

  beforeEach(() => {
    window.localStorage.clear();
    mockNavigate.mockReset();
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
    mockedApi.put.mockReset();
    mockedApi.patch.mockReset();
    mockedApi.delete.mockReset();

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/auth/preferences') {
        return Promise.resolve({ data: { preferences: {} } });
      }

      if (url === '/admin/branding') {
        return Promise.resolve({ data: {} });
      }

      if (url === '/admin/roles') {
        return Promise.resolve({ data: { roles: [] } });
      }

      return Promise.resolve({ data: {} });
    });
  });

  it('preserves typed organization values without triggering navigation or bootstrap reloads', async () => {
    const user = userEvent.setup();

    renderAdminSettings();

    const nameInput = await screen.findByPlaceholderText(/your nonprofit name/i);

    await waitFor(() => {
      expect(countGetCalls('/auth/preferences')).toBe(1);
    });

    const initialPreferenceCalls = countGetCalls('/auth/preferences');
    mockNavigate.mockClear();

    await user.type(nameInput, 'West Cat');

    await waitFor(() => {
      expect(nameInput).toHaveValue('West Cat');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(countGetCalls('/auth/preferences')).toBe(initialPreferenceCalls);
  });
});
