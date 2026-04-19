import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../../../services/bootstrap/staffBootstrap', () => ({
  clearStaffBootstrapSnapshot: vi.fn(),
  getStaffBootstrapSnapshot: vi.fn(),
  setStaffBootstrapSnapshot: vi.fn(),
}));

vi.mock('../../../services/brandingService', () => ({
  invalidateBrandingCache: vi.fn(),
}));

vi.mock('../../../hooks/useNavigationPreferences', () => ({
  invalidateNavigationPreferencesCache: vi.fn(),
}));

vi.mock('../../../services/userPreferencesService', () => ({
  invalidateUserPreferencesCache: vi.fn(),
}));

import api from '../../../services/api';
import {
  clearStaffBootstrapSnapshot,
  getStaffBootstrapSnapshot,
  setStaffBootstrapSnapshot,
} from '../../../services/bootstrap/staffBootstrap';
import {
  clearWorkspaceModuleAccessCache,
  getWorkspaceModuleAccessCachedSync,
  setWorkspaceModuleAccessCached,
} from '../../../services/workspaceModuleAccessService';
import reducer, { initializeAuth, logoutAsync, setCredentials } from './authCore';

const workspaceModuleEvent = 'workspace-modules:updated';

const authenticatedUser = {
  id: 'user-1',
  email: 'admin@example.com',
  firstName: 'Ada',
  lastName: 'Admin',
  role: 'admin',
};

const createStore = () =>
  configureStore({
    reducer: {
      auth: reducer,
    },
  });

describe('authCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    clearWorkspaceModuleAccessCache();
  });

  it('treats setCredentials as the login path and persists bootstrap state', () => {
    const store = createStore();

    store.dispatch(
      setCredentials({
        user: authenticatedUser,
        organizationId: 'org-1',
      })
    );

    expect(store.getState().auth).toMatchObject({
      user: authenticatedUser,
      isAuthenticated: true,
      authLoading: false,
      loading: false,
    });
    expect(window.localStorage.getItem('user')).toBe(JSON.stringify(authenticatedUser));
    expect(window.localStorage.getItem('organizationId')).toBe('org-1');
    expect(setStaffBootstrapSnapshot).toHaveBeenCalledWith({
      user: authenticatedUser,
      organizationId: 'org-1',
    });
  });

  it('hydrates authenticated state from the bootstrap snapshot during initializeAuth', async () => {
    vi.mocked(getStaffBootstrapSnapshot).mockResolvedValueOnce({
      user: authenticatedUser,
      organizationId: 'org-2',
    } as never);

    const store = createStore();
    const action = await store.dispatch(initializeAuth());

    expect(action.meta.requestStatus).toBe('fulfilled');
    expect(store.getState().auth).toMatchObject({
      user: authenticatedUser,
      isAuthenticated: true,
      authLoading: false,
    });
    expect(window.localStorage.getItem('user')).toBe(JSON.stringify(authenticatedUser));
    expect(window.localStorage.getItem('organizationId')).toBe('org-2');
    expect(setStaffBootstrapSnapshot).toHaveBeenCalledWith({
      user: authenticatedUser,
      organizationId: 'org-2',
    });
  });

  it('clears stored auth and workspace-module state when initializeAuth rejects', async () => {
    window.localStorage.setItem('user', JSON.stringify(authenticatedUser));
    window.localStorage.setItem('organizationId', 'org-stale');
    setWorkspaceModuleAccessCached({ cases: false });

    const workspaceUpdateListener = vi.fn();
    window.addEventListener(workspaceModuleEvent, workspaceUpdateListener);
    vi.mocked(getStaffBootstrapSnapshot).mockRejectedValueOnce(new Error('Unauthenticated'));

    const store = createStore();
    const action = await store.dispatch(initializeAuth());

    expect(action.meta.requestStatus).toBe('rejected');
    expect(store.getState().auth).toMatchObject({
      user: null,
      isAuthenticated: false,
      authLoading: false,
    });
    expect(window.localStorage.getItem('user')).toBeNull();
    expect(window.localStorage.getItem('organizationId')).toBeNull();
    expect(window.localStorage.getItem('workspace_module_settings')).toBeNull();
    expect(getWorkspaceModuleAccessCachedSync()).toMatchObject({
      cases: true,
    });
    expect(clearStaffBootstrapSnapshot).toHaveBeenCalledTimes(1);
    expect(workspaceUpdateListener).toHaveBeenCalledTimes(1);
    window.removeEventListener(workspaceModuleEvent, workspaceUpdateListener);
  });

  it('logs out client state and clears workspace-module access even when the server call fails', async () => {
    const store = createStore();

    store.dispatch(
      setCredentials({
        user: authenticatedUser,
        organizationId: 'org-1',
      })
    );
    setWorkspaceModuleAccessCached({ grants: false });
    const workspaceUpdateListener = vi.fn();
    window.addEventListener(workspaceModuleEvent, workspaceUpdateListener);
    workspaceUpdateListener.mockClear();
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network down'));

    await store.dispatch(logoutAsync());

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(store.getState().auth).toMatchObject({
      user: null,
      isAuthenticated: false,
      authLoading: false,
      loading: false,
    });
    expect(window.localStorage.getItem('user')).toBeNull();
    expect(window.localStorage.getItem('organizationId')).toBeNull();
    expect(window.localStorage.getItem('workspace_module_settings')).toBeNull();
    expect(getWorkspaceModuleAccessCachedSync()).toMatchObject({
      grants: true,
    });
    expect(clearStaffBootstrapSnapshot).toHaveBeenCalledTimes(1);
    expect(workspaceUpdateListener).toHaveBeenCalledTimes(1);
    window.removeEventListener(workspaceModuleEvent, workspaceUpdateListener);
  });
});
