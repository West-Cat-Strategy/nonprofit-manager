import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPortalUnauthorizedHandler,
  resetPortalUnauthorizedHandlerStateForTests,
} from '../portalUnauthorizedHandler';

describe('portal unauthorized handling', () => {
  beforeEach(() => {
    resetPortalUnauthorizedHandlerStateForTests();
  });

  it('dispatches portal:unauthorized when endpoint 401 and portal bootstrap check is also 401', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 401 } as Response);
    const dispatchUnauthorizedEvent = vi.fn();

    const onUnauthorized = createPortalUnauthorizedHandler({
      fetchFn,
      getPathname: () => '/portal',
      dispatchUnauthorizedEvent,
      scheduleReset: vi.fn(),
    });

    await onUnauthorized({ config: { url: '/portal/cases' } });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('/portal/auth/bootstrap');
    expect(dispatchUnauthorizedEvent).toHaveBeenCalledTimes(1);
  });

  it('does not validate or dispatch for excluded portal auth endpoints', async () => {
    const fetchFn = vi.fn();
    const dispatchUnauthorizedEvent = vi.fn();

    const onUnauthorized = createPortalUnauthorizedHandler({
      fetchFn,
      getPathname: () => '/portal/login',
      dispatchUnauthorizedEvent,
      scheduleReset: vi.fn(),
    });

    await onUnauthorized({ config: { url: '/portal/auth/bootstrap' } });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(dispatchUnauthorizedEvent).not.toHaveBeenCalled();
  });
});
