import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUnauthorizedHandler,
  resetUnauthorizedHandlerStateForTests,
} from '../unauthorizedHandler';

describe('api unauthorized handling', () => {
  beforeEach(() => {
    resetUnauthorizedHandlerStateForTests();
  });

  it('dispatches app:unauthorized when endpoint 401 and session check is also 401', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 401 } as Response);
    const dispatchUnauthorizedEvent = vi.fn();
    const scheduleReset = vi.fn();

    const onUnauthorized = createUnauthorizedHandler({
      fetchFn,
      getPathname: () => '/settings/admin',
      dispatchUnauthorizedEvent,
      scheduleReset,
    });

    await onUnauthorized({ config: { url: '/admin/email-settings' } });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(dispatchUnauthorizedEvent).toHaveBeenCalledTimes(1);
    expect(scheduleReset).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch when endpoint 401 but session check succeeds', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 200 } as Response);
    const dispatchUnauthorizedEvent = vi.fn();

    const onUnauthorized = createUnauthorizedHandler({
      fetchFn,
      getPathname: () => '/settings/admin',
      dispatchUnauthorizedEvent,
      scheduleReset: vi.fn(),
    });

    await onUnauthorized({ config: { url: '/admin/email-settings' } });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(dispatchUnauthorizedEvent).not.toHaveBeenCalled();
  });

  it('does not validate or dispatch for excluded auth/setup endpoints', async () => {
    const fetchFn = vi.fn();
    const dispatchUnauthorizedEvent = vi.fn();

    const onUnauthorized = createUnauthorizedHandler({
      fetchFn,
      getPathname: () => '/settings/admin',
      dispatchUnauthorizedEvent,
      scheduleReset: vi.fn(),
    });

    await onUnauthorized({ config: { url: '/auth/me' } });
    await onUnauthorized({ config: { url: '/auth/setup-status' } });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(dispatchUnauthorizedEvent).not.toHaveBeenCalled();
  });

  it('coalesces concurrent 401s into one session validation and one dispatch', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    const fetchFn = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    const dispatchUnauthorizedEvent = vi.fn();

    const onUnauthorized = createUnauthorizedHandler({
      fetchFn,
      getPathname: () => '/settings/admin',
      dispatchUnauthorizedEvent,
      scheduleReset: vi.fn(),
    });

    const p1 = onUnauthorized({ config: { url: '/admin/email-settings' } });
    const p2 = onUnauthorized({ config: { url: '/admin/branding' } });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    if (!resolveFetch) throw new Error('fetch resolver not captured');
    resolveFetch({ status: 401 } as Response);

    await Promise.all([p1, p2]);

    expect(dispatchUnauthorizedEvent).toHaveBeenCalledTimes(1);
  });
});
