import type { ReactNode } from 'react';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestStore, renderWithProviders } from '../../../../test/testUtils';
import UserSettingsPage from '../UserSettingsPage';
import LoopApiService from '../../../../services/LoopApiService';
import api from '../../../../services/api';
import { clearStaffBootstrapSnapshot, getStaffBootstrapSnapshot } from '../../../../services/bootstrap/staffBootstrap';

vi.mock('../../../../services/LoopApiService', () => ({
  default: {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../components/ThemeSelector', () => ({
  default: () => <div>theme selector</div>,
}));

vi.mock('../../../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => undefined,
}));

const mockedLoopApiService = vi.mocked(LoopApiService);
const mockedApi = vi.mocked(api);

const baseProfile = {
  firstName: 'Taylor',
  lastName: 'Staff',
  email: 'taylor.staff@example.com',
  emailSharedWithClients: false,
  emailSharedWithUsers: true,
  alternativeEmails: [],
  displayName: '',
  alternativeName: '',
  pronouns: '',
  title: '',
  cellPhone: '',
  contactNumber: '',
  profilePicture: null,
  notifications: {
    emailNotifications: true,
    taskReminders: true,
    eventReminders: true,
    donationAlerts: true,
    caseUpdates: true,
    weeklyDigest: false,
    marketingEmails: false,
  },
};

describe('UserSettingsPage', () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    class MockFileReader {
      public onload: ((event: { target: { result: string } }) => void) | null = null;
      public onerror: (() => void) | null = null;

      readAsDataURL() {
        this.onload?.({ target: { result: 'data:image/png;base64,raw-upload' } });
      }
    }

    class MockImage {
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public width = 200;
      public height = 200;

      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.stubGlobal('FileReader', MockFileReader);
    vi.stubGlobal('Image', MockImage);

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,resized-preview');
  });

  beforeEach(() => {
    localStorage.clear();
    clearStaffBootstrapSnapshot();
    mockedLoopApiService.getUserProfile.mockResolvedValue(baseProfile);
    mockedLoopApiService.updateUserProfile.mockResolvedValue(baseProfile);
    mockedApi.get.mockResolvedValue({ data: { totpEnabled: false, passkeys: [] } });
    mockedApi.put.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uploads an avatar, saves it, and syncs auth/bootstrap state', async () => {
    const user = userEvent.setup();
    const savedProfile = {
      ...baseProfile,
      firstName: 'Taylor',
      lastName: 'Updated',
      profilePicture: 'data:image/jpeg;base64,resized-preview',
    };
    mockedLoopApiService.updateUserProfile.mockResolvedValue(savedProfile);

    const store = createTestStore({
      auth: {
        user: {
          id: 'user-1',
          email: baseProfile.email,
          firstName: baseProfile.firstName,
          lastName: baseProfile.lastName,
          role: 'admin',
          profilePicture: null,
        },
        isAuthenticated: true,
        authLoading: false,
        loading: false,
      },
    });

    const { container } = renderWithProviders(<UserSettingsPage />, {
      store,
      route: '/settings/user',
    });

    await screen.findByRole('button', { name: /save all changes/i });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    await user.upload(
      fileInput,
      new File(['avatar'], 'avatar.png', { type: 'image/png' })
    );

    await waitFor(() => {
      expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'data:image/jpeg;base64,resized-preview');
    });

    await user.click(screen.getByRole('button', { name: /save all changes/i }));

    await waitFor(() => {
      expect(mockedLoopApiService.updateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          profilePicture: 'data:image/jpeg;base64,resized-preview',
        })
      );
    });

    await screen.findByText(/profile saved successfully/i);

    expect(store.getState().auth.user?.profilePicture).toBe(savedProfile.profilePicture);
    expect(store.getState().auth.user?.lastName).toBe('Updated');

    const snapshot = await getStaffBootstrapSnapshot();
    expect(snapshot.user?.profilePicture).toBe(savedProfile.profilePicture);
    expect(snapshot.user?.lastName).toBe('Updated');
  });

  it('removes an existing avatar and persists the cleared state', async () => {
    const user = userEvent.setup();
    mockedLoopApiService.getUserProfile.mockResolvedValue({
      ...baseProfile,
      profilePicture: 'data:image/png;base64,existing-avatar',
    });
    mockedLoopApiService.updateUserProfile.mockResolvedValue({
      ...baseProfile,
      profilePicture: null,
    });

    const store = createTestStore({
      auth: {
        user: {
          id: 'user-1',
          email: baseProfile.email,
          firstName: baseProfile.firstName,
          lastName: baseProfile.lastName,
          role: 'admin',
          profilePicture: 'data:image/png;base64,existing-avatar',
        },
        isAuthenticated: true,
        authLoading: false,
        loading: false,
      },
    });

    renderWithProviders(<UserSettingsPage />, {
      store,
      route: '/settings/user',
    });

    await screen.findByAltText('Profile');

    await user.click(screen.getByTitle(/remove profile picture/i));
    await user.click(screen.getByRole('button', { name: /save all changes/i }));

    await waitFor(() => {
      expect(mockedLoopApiService.updateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          profilePicture: null,
        })
      );
    });

    await screen.findByText(/profile saved successfully/i);

    expect(store.getState().auth.user?.profilePicture).toBeNull();
    const snapshot = await getStaffBootstrapSnapshot();
    expect(snapshot.user?.profilePicture).toBeNull();
  });
});
