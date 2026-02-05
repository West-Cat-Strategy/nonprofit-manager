import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Check for existing token and user on initialization
const token = localStorage.getItem('token');
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

// 🔧 DEV MODE: Auto-authenticate for development
// Opt-in only: set `VITE_DEV_AUTO_LOGIN=true` to bypass the login screen locally.
// Multiple safeguards prevent this from running in production.
const DEV_MODE = import.meta.env.DEV;
const DEV_AUTO_LOGIN = import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';

// Additional production safeguards
const isProductionBuild = import.meta.env.PROD;
const isNotLocalhost = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

// Block dev auto-login if ANY production indicator is detected
const shouldBlockDevLogin = isProductionBuild || isNotLocalhost;

if (DEV_MODE && DEV_AUTO_LOGIN && !token && !shouldBlockDevLogin) {
  const devUser: User = {
    id: '1',
    email: 'dev@example.com',
    firstName: 'Dev',
    lastName: 'User',
    role: 'admin',
  };
  const devToken = 'dev-token-' + Date.now();

  user = devUser;
  localStorage.setItem('token', devToken);
  localStorage.setItem('user', JSON.stringify(devUser));
  const defaultOrgId = import.meta.env.VITE_DEFAULT_ORGANIZATION_ID;
  if (defaultOrgId) {
    localStorage.setItem('organizationId', defaultOrgId);
  }

  console.log('🔧 [DEV MODE] Auto-authenticated as:', devUser.email);
} else if (DEV_AUTO_LOGIN && shouldBlockDevLogin) {
  // Log security warning if dev auto-login was attempted in production-like environment
  console.warn('🔒 [SECURITY] Dev auto-login blocked: Production environment detected');
  if (isHttps) {
    console.warn('🔒 [SECURITY] HTTPS detected - ensure VITE_DEV_AUTO_LOGIN is disabled');
  }
}

const initialState: AuthState = {
  user: user,
  token: token || localStorage.getItem('token'),
  isAuthenticated: !!(token || localStorage.getItem('token')),
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      localStorage.removeItem('token');
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
});

export const { setCredentials, logout, setLoading, updateUser } = authSlice.actions;
export default authSlice.reducer;
