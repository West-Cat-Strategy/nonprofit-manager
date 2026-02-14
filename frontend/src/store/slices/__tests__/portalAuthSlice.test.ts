import { describe, it, expect, beforeEach, vi } from 'vitest';
import reducer, {
  portalLogout,
  clearPortalError,
  portalLogin,
  portalSignup,
  portalFetchMe,
} from '../portalAuthSlice';

// ─── localStorage mock ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const mockUser = { id: 'portal-user-1', email: 'member@example.com', contactId: 'contact-1' };

const initialState = {
  token: null as string | null,
  user: null as typeof mockUser | null,
  loading: false,
  error: null as string | null,
  signupStatus: 'idle' as 'idle' | 'pending' | 'success' | 'error',
};

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ─── Reducers ─────────────────────────────────────────────────────────────────

describe('portalAuthSlice reducers', () => {
  it('portalLogout clears token, user, and error from state', () => {
    const loggedIn = { ...initialState, token: 'tok-abc', user: mockUser, error: 'old' };
    const state = reducer(loggedIn as never, portalLogout());
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
  });

  it('portalLogout removes portal_token from localStorage', () => {
    localStorageMock.setItem('portal_token', 'tok-abc');
    reducer({ ...initialState, token: 'tok-abc' } as never, portalLogout());
    expect(localStorageMock.getItem('portal_token')).toBeNull();
  });

  it('clearPortalError sets error to null', () => {
    const state = reducer({ ...initialState, error: 'Auth failed' } as never, clearPortalError());
    expect(state.error).toBeNull();
  });
});

// ─── portalLogin thunk ────────────────────────────────────────────────────────

describe('portalLogin thunk', () => {
  it('sets loading=true and clears error on pending', () => {
    const state = reducer(
      { ...initialState, error: 'previous error' } as never,
      { type: portalLogin.pending.type }
    );
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('sets token and user on fulfilled', () => {
    const payload = {
      token: 'portal-jwt-token',
      user: { id: 'portal-user-1', email: 'member@example.com', contact_id: 'contact-1' },
    };
    const state = reducer(
      { ...initialState, loading: true } as never,
      { type: portalLogin.fulfilled.type, payload }
    );
    expect(state.loading).toBe(false);
    expect(state.token).toBe('portal-jwt-token');
    expect(state.user).toEqual(payload.user);
  });

  it('persists token to localStorage on fulfilled', () => {
    const payload = { token: 'portal-jwt-token', user: mockUser };
    reducer(
      { ...initialState, loading: true } as never,
      { type: portalLogin.fulfilled.type, payload }
    );
    expect(localStorageMock.getItem('portal_token')).toBe('portal-jwt-token');
  });

  it('sets error on rejected', () => {
    const state = reducer(
      { ...initialState, loading: true } as never,
      { type: portalLogin.rejected.type, error: { message: 'Invalid credentials' } }
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('uses fallback error message on rejected', () => {
    const state = reducer(
      initialState as never,
      { type: portalLogin.rejected.type, error: {} }
    );
    expect(state.error).toBe('Failed to login');
  });
});

// ─── portalSignup thunk ───────────────────────────────────────────────────────

describe('portalSignup thunk', () => {
  it('sets loading=true and signupStatus="pending" on pending', () => {
    const state = reducer(
      initialState as never,
      { type: portalSignup.pending.type }
    );
    expect(state.loading).toBe(true);
    expect(state.signupStatus).toBe('pending');
  });

  it('sets signupStatus="success" on fulfilled', () => {
    const state = reducer(
      { ...initialState, loading: true, signupStatus: 'pending' } as never,
      { type: portalSignup.fulfilled.type }
    );
    expect(state.loading).toBe(false);
    expect(state.signupStatus).toBe('success');
  });

  it('sets error and signupStatus="error" on rejected', () => {
    const state = reducer(
      { ...initialState, loading: true, signupStatus: 'pending' } as never,
      { type: portalSignup.rejected.type, error: { message: 'Email taken' } }
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Email taken');
    expect(state.signupStatus).toBe('error');
  });

  it('uses fallback error message on rejected', () => {
    const state = reducer(
      initialState as never,
      { type: portalSignup.rejected.type, error: {} }
    );
    expect(state.error).toBe('Failed to signup');
  });
});

// ─── portalFetchMe thunk ──────────────────────────────────────────────────────

describe('portalFetchMe thunk', () => {
  it('maps contact_id → contactId and sets user on fulfilled', () => {
    const payload = {
      id: 'portal-user-1',
      email: 'member@example.com',
      contact_id: 'contact-1',
    };
    const state = reducer(
      initialState as never,
      { type: portalFetchMe.fulfilled.type, payload }
    );
    expect(state.user).toEqual({
      id: 'portal-user-1',
      email: 'member@example.com',
      contactId: 'contact-1',
    });
  });

  it('sets contactId to null when contact_id is null', () => {
    const payload = { id: 'portal-user-1', email: 'member@example.com', contact_id: null };
    const state = reducer(
      initialState as never,
      { type: portalFetchMe.fulfilled.type, payload }
    );
    expect(state.user?.contactId).toBeNull();
  });
});
