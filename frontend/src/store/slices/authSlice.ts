import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface User {
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

const initialState: AuthState = {
  user: user,
  isAuthenticated: false, // Always false until /auth/me verifies the cookie
  authLoading: true,      // True until initializeAuth completes
  loading: false,
};

// Async thunk: verify auth via httpOnly cookie
export const initializeAuth = createAsyncThunk('auth/initializeAuth', async () => {
  const response = await api.get('/auth/me');
  return response.data as User;
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
    setCredentials: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
      state.authLoading = false;
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.authLoading = false;
      localStorage.removeItem('user');
      localStorage.removeItem('organizationId');
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.authLoading = false;
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.authLoading = false;
        localStorage.removeItem('user');
        localStorage.removeItem('organizationId');
      });
  },
});

export const { setCredentials, logout, setLoading, updateUser } = authSlice.actions;
export default authSlice.reducer;
