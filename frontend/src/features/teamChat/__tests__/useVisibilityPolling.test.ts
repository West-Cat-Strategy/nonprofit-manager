import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVisibilityPolling } from '../hooks/useVisibilityPolling';

const setDocumentHidden = (value: boolean) => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => value,
  });
};

describe('useVisibilityPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDocumentHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls while tab is visible and stops when hidden', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useVisibilityPolling(callback, {
        enabled: true,
        intervalMs: 1000,
      })
    );

    expect(callback).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(callback).toHaveBeenCalledTimes(3);

    setDocumentHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('restarts polling and runs immediately when tab becomes visible again', async () => {
    const callback = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useVisibilityPolling(callback, {
        enabled: true,
        intervalMs: 1000,
      })
    );

    expect(callback).toHaveBeenCalledTimes(1);

    setDocumentHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    setDocumentHidden(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(callback).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });
});
