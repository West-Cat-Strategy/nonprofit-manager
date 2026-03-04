import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { __resetSetupStatusCacheForTests, useSetupCheck } from '../useSetupCheck';

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
    __resetSetupStatusCacheForTests();
  });

  it('returns loading=true initially, then loading=false after fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: false, userCount: 1 } });

    const { result } = renderHook(() => useSetupCheck());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.setupRequired).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets setupRequired=true when setup is needed', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: true, userCount: 0 } });

    const { result } = renderHook(() => useSetupCheck());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.setupRequired).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('keeps setup status unresolved and exposes error message when setup check fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSetupCheck());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.setupRequired).toBeNull();
    expect(result.current.error).toMatch(/network error/i);
  });

  it('keeps setup status unresolved when response shape is invalid', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { userCount: 2 } });

    const { result } = renderHook(() => useSetupCheck());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.setupRequired).toBeNull();
    expect(result.current.error).toMatch(/invalid/i);
  });

  it('calls /auth/setup-status endpoint', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: false, userCount: 1 } });

    renderHook(() => useSetupCheck());

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/auth/setup-status'));
  });

  it('skips setup-status request when disabled', async () => {
    const { result } = renderHook(() => useSetupCheck({ enabled: false }));

    expect(result.current.loading).toBe(false);
    expect(result.current.setupRequired).toBeNull();
    expect(result.current.error).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('refreshSetupStatus is a no-op when disabled', async () => {
    const { result } = renderHook(() => useSetupCheck({ enabled: false }));

    await act(async () => {
      await result.current.refreshSetupStatus({ forceRefresh: true });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.setupRequired).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('reuses cached setup status across hook mounts', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { setupRequired: false, userCount: 1 } });

    const firstHook = renderHook(() => useSetupCheck());
    await waitFor(() => expect(firstHook.result.current.loading).toBe(false));
    firstHook.unmount();

    const secondHook = renderHook(() => useSetupCheck());
    await waitFor(() => expect(secondHook.result.current.loading).toBe(false));

    expect(secondHook.result.current.setupRequired).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
