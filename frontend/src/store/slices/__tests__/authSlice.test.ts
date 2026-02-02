import reducer, { setCredentials, logout, setLoading } from '../authSlice';

const baseState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('sets credentials and stores token', () => {
    const nextState = reducer(
      baseState,
      setCredentials({
        token: 'token-abc',
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
    expect(nextState.token).toBe('token-abc');
    expect(localStorage.getItem('token')).toBe('token-abc');
  });

  it('clears credentials on logout', () => {
    localStorage.setItem('token', 'token-abc');

    const nextState = reducer(
      {
        ...baseState,
        token: 'token-abc',
        isAuthenticated: true,
      },
      logout()
    );

    expect(nextState.user).toBeNull();
    expect(nextState.token).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('updates loading state', () => {
    const nextState = reducer(baseState, setLoading(false));
    expect(nextState.loading).toBe(false);
  });
});
