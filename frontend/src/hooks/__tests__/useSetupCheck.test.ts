import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSetupCheck } from '../useSetupCheck';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Mock the API module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../services/api';

describe('useSetupCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/';
  });

  it('returns loading=true initially, then loading=false after fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: false, userCount: 1 } });

    const { result } = renderHook(() => useSetupCheck());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.setupRequired).toBe(false);
  });

  it('sets setupRequired=true when setup is needed', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: true, userCount: 0 } });

    const { result } = renderHook(() => useSetupCheck());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.setupRequired).toBe(true);
  });

  it('navigates to /setup when setupRequired=true and not already there', async () => {
    mockLocation.pathname = '/dashboard';
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: true, userCount: 0 } });

    renderHook(() => useSetupCheck());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/setup', { replace: true }));
  });

  it('does not navigate to /setup when already on /setup', async () => {
    mockLocation.pathname = '/setup';
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: true, userCount: 0 } });

    renderHook(() => useSetupCheck());

    await waitFor(() => expect(mockNavigate).not.toHaveBeenCalledWith('/setup', expect.anything()));
  });

  it('navigates to /login when setup is done and user is on /setup', async () => {
    mockLocation.pathname = '/setup';
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: false, userCount: 1 } });

    renderHook(() => useSetupCheck());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true }));
  });

  it('defaults to setupRequired=false on API error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSetupCheck());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.setupRequired).toBe(false);
  });

  it('calls /auth/setup-status endpoint', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: false, userCount: 1 } });

    renderHook(() => useSetupCheck());

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/auth/setup-status'));
  });
});
