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
  token: localStorage.getItem('portal_token'),
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

const portalAuthSlice = createSlice({
  name: 'portalAuth',
  initialState,
  reducers: {
    portalLogout: (state) => {
      state.token = null;
      state.user = null;
      state.error = null;
      localStorage.removeItem('portal_token');
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
        state.token = action.payload.token;
        state.user = action.payload.user;
        localStorage.setItem('portal_token', action.payload.token);
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
      .addCase(portalFetchMe.fulfilled, (state, action) => {
        state.user = {
          id: action.payload.id,
          email: action.payload.email,
          contactId: action.payload.contact_id,
        };
      });
  },
});

export const { portalLogout, clearPortalError } = portalAuthSlice.actions;
export default portalAuthSlice.reducer;
