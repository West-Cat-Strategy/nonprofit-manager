import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPortalUnauthorizedHandler,
  resetPortalUnauthorizedHandlerStateForTests,
} from '../portalUnauthorizedHandler';

describe('portal unauthorized handling', () => {
  beforeEach(() => {
    resetPortalUnauthorizedHandlerStateForTests();
  });

  it('dispatches portal:unauthorized immediately for protected portal 401s', async () => {
    const dispatchUnauthorizedEvent = vi.fn();

    const onUnauthorized = createPortalUnauthorizedHandler({
      getPathname: () => '/portal',
      dispatchUnauthorizedEvent,
      scheduleReset: vi.fn(),
    });

    await onUnauthorized({ config: { url: '/portal/cases' } });

    expect(dispatchUnauthorizedEvent).toHaveBeenCalledTimes(1);
  });

  it('does not validate or dispatch for excluded portal auth endpoints', async () => {
    const dispatchUnauthorizedEvent = vi.fn();

    const onUnauthorized = createPortalUnauthorizedHandler({
      getPathname: () => '/portal/login',
      dispatchUnauthorizedEvent,
      scheduleReset: vi.fn(),
    });

    await onUnauthorized({ config: { url: '/portal/auth/bootstrap' } });

    expect(dispatchUnauthorizedEvent).not.toHaveBeenCalled();
  });
});
