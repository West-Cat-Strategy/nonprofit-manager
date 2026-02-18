import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import portalApi from '../../services/portalApi';

interface PortalUser {
  id: string;
  email: string;
  contactId: string | null;
}

interface PortalAuthState {
  token: string | null;
  user: PortalUser | null;
  loading: boolean;
  error: string | null;
  signupStatus: 'idle' | 'pending' | 'success' | 'error';
}

const initialState: PortalAuthState = {
  token: null, // Token is now stored in HTTP-only cookie, not localStorage
  user: null,
  loading: false,
  error: null,
  signupStatus: 'idle',
};

export const portalLogin = createAsyncThunk(
  'portalAuth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await portalApi.post('/portal/auth/login', { email, password });
    return response.data;
  }
);

export const portalSignup = createAsyncThunk(
  'portalAuth/signup',
  async (payload: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    const response = await portalApi.post('/portal/auth/signup', payload);
    return response.data;
  }
);

export const portalFetchMe = createAsyncThunk('portalAuth/me', async () => {
  const response = await portalApi.get('/portal/auth/me');
  return response.data;
});

export const portalLogoutAsync = createAsyncThunk('portalAuth/logout', async (_, { dispatch }) => {
  try {
    await portalApi.post('/portal/auth/logout');
  } catch {
    // Always clear client-side state even if network/logout endpoint fails.
  }
  dispatch(portalLogout());
});

const portalAuthSlice = createSlice({
  name: 'portalAuth',
  initialState,
  reducers: {
    portalLogout: (state) => {
      state.token = null;
      state.user = null;
      state.error = null;
      // Token is now in HTTP-only cookie; no need to remove from localStorage
    },
    clearPortalError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(portalLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(portalLogin.fulfilled, (state, action) => {
        state.loading = false;
        // Token is now stored in HTTP-only cookie; don't store in Redux state
        state.token = null;
        state.user = action.payload.user;
        // Don't store token in localStorage anymore
      })
      .addCase(portalLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to login';
      })
      .addCase(portalSignup.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.signupStatus = 'pending';
      })
      .addCase(portalSignup.fulfilled, (state) => {
        state.loading = false;
        state.signupStatus = 'success';
      })
      .addCase(portalSignup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to signup';
        state.signupStatus = 'error';
      })
      .addCase(portalFetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(portalFetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = {
          id: action.payload.id,
          email: action.payload.email,
          contactId: action.payload.contact_id,
        };
        state.error = null;
      })
      .addCase(portalFetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
      })
      .addCase(portalLogoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(portalLogoutAsync.fulfilled, (state) => {
        state.loading = false;
      });
  },
});

export const { portalLogout, clearPortalError } = portalAuthSlice.actions;
export default portalAuthSlice.reducer;
