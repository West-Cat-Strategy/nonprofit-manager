import reducer, { setCredentials, logout, setLoading } from '../authSlice';

const baseState = {
  user: null,
  isAuthenticated: false,
  authLoading: false,
  loading: true,
};

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets credentials without storing a token', () => {
    const nextState = reducer(
      baseState,
      setCredentials({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
        },
      })
    );

    expect(nextState.isAuthenticated).toBe(true);
    expect(nextState.authLoading).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBe(
      JSON.stringify({ id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'user' })
    );
  });

  it('clears credentials on logout', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'user-1' }));

    const nextState = reducer(
      {
        ...baseState,
        user: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User', role: 'user' },
        isAuthenticated: true,
      },
      logout()
    );

    expect(nextState.user).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('updates loading state', () => {
    const nextState = reducer(baseState, setLoading(false));
    expect(nextState.loading).toBe(false);
  });
});
