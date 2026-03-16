import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../../services/api';
import {
  clearStaffBootstrapSnapshot,
  getStaffBootstrapSnapshot,
  setStaffBootstrapSnapshot,
} from '../../../services/bootstrap/staffBootstrap';
import { invalidateBrandingCache } from '../../../services/brandingService';
import { invalidateUserPreferencesCache } from '../../../services/userPreferencesService';
import { clearWorkspaceModuleAccessCache } from '../../../services/workspaceModuleAccessService';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  loading: boolean;
}

interface AuthCredentialsPayload {
  user: User;
  organizationId?: string | null;
}

// Load user from localStorage (non-sensitive, used for UX during init loading)
const storedUser = localStorage.getItem('user');
let user: User | null = null;

if (storedUser) {
  try {
    user = JSON.parse(storedUser);
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    localStorage.removeItem('user');
  }
}

const getStoredOrganizationId = (): string | null => {
  const storedOrganizationId = localStorage.getItem('organizationId');
  if (!storedOrganizationId) {
    return null;
  }

  const trimmed = storedOrganizationId.trim();
  if (!trimmed) {
    localStorage.removeItem('organizationId');
    return null;
  }

  return trimmed;
};

const syncOrganizationIdStorage = (organizationId?: string | null): string | null => {
  if (organizationId === undefined) {
    return getStoredOrganizationId();
  }

  if (typeof organizationId === 'string') {
    const trimmed = organizationId.trim();
    if (trimmed) {
      localStorage.setItem('organizationId', trimmed);
      return trimmed;
    }
  }

  localStorage.removeItem('organizationId');
  return null;
};

const initialState: AuthState = {
  user: user,
  isAuthenticated: false, // Always false until bootstrap verifies the session cookie
  authLoading: true,      // True until initializeAuth completes
  loading: false,
};

// Async thunk: verify auth via httpOnly cookie
export const initializeAuth = createAsyncThunk('auth/initializeAuth', async () => {
  const snapshot = await getStaffBootstrapSnapshot();
  if (!snapshot.user) {
    throw new Error('Unauthenticated');
  }
  return {
    user: snapshot.user,
    organizationId: snapshot.organizationId,
  } satisfies AuthCredentialsPayload;
});

// Async thunk: server-side logout (clears httpOnly cookie), then clears client state
export const logoutAsync = createAsyncThunk('auth/logoutAsync', async (_, { dispatch }) => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore errors — proceed with client-side logout regardless
  }
  dispatch(logout());
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthCredentialsPayload>) => {
      const organizationId = syncOrganizationIdStorage(action.payload.organizationId);
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
      state.authLoading = false;
      setStaffBootstrapSnapshot({ user: action.payload.user, organizationId });
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.authLoading = false;
      clearStaffBootstrapSnapshot();
      invalidateBrandingCache();
      invalidateUserPreferencesCache();
      clearWorkspaceModuleAccessCache();
      localStorage.removeItem('user');
      localStorage.removeItem('organizationId');
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        setStaffBootstrapSnapshot({
          user: state.user,
          organizationId: getStoredOrganizationId(),
        });
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        const organizationId = syncOrganizationIdStorage(action.payload.organizationId);
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.authLoading = false;
        setStaffBootstrapSnapshot({ user: action.payload.user, organizationId });
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.authLoading = false;
        clearStaffBootstrapSnapshot();
        invalidateBrandingCache();
        invalidateUserPreferencesCache();
        clearWorkspaceModuleAccessCache();
        localStorage.removeItem('user');
        localStorage.removeItem('organizationId');
      });
  },
});

export const { setCredentials, logout, setLoading, updateUser } = authSlice.actions;
export default authSlice.reducer;
