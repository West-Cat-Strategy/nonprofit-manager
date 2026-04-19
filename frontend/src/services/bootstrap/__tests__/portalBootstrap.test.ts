import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../portalApi', () => ({
  default: {
    get: vi.fn(),
  },
}));

import portalApi from '../../portalApi';
import {
  clearPortalBootstrapSnapshot,
  getPortalBootstrapSnapshot,
  __seedPortalBootstrapSnapshotStorageForTests,
} from '../portalBootstrap';

describe('portalBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
    clearPortalBootstrapSnapshot();
    window.sessionStorage.clear();
  });

  it('captures bootstrap state from /portal/auth/bootstrap', async () => {
    vi.mocked(portalApi.get).mockResolvedValueOnce({
      data: {
        user: {
          id: 'portal-user-1',
          email: 'member@example.com',
          contactId: 'contact-1',
        },
      },
    });

    const snapshot = await getPortalBootstrapSnapshot({ forceRefresh: true });

    expect(portalApi.get).toHaveBeenCalledWith('/portal/auth/bootstrap');
    expect(snapshot).toMatchObject({
      status: 'authenticated',
      user: {
        id: 'portal-user-1',
        email: 'member@example.com',
        contactId: 'contact-1',
      },
    });
  });

  it('skips the bootstrap probe for guest portal routes', async () => {
    window.history.pushState({}, '', '/portal/login');

    const snapshot = await getPortalBootstrapSnapshot({ forceRefresh: true });

    expect(portalApi.get).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({
      status: 'anonymous',
      user: null,
    });
  });

  it('seeds authenticated bootstrap state from a fallback user without probing', async () => {
    const fallbackUser = {
      id: 'portal-user-2',
      email: 'seeded@example.com',
      contactId: 'contact-2',
    };

    const snapshot = await getPortalBootstrapSnapshot({
      forceRefresh: true,
      fallbackUser,
    });

    expect(portalApi.get).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({
      status: 'authenticated',
      user: fallbackUser,
    });

    clearPortalBootstrapSnapshot();
    __seedPortalBootstrapSnapshotStorageForTests({
      status: 'authenticated',
      user: fallbackUser,
      fetchedAt: Date.now(),
    });
    expect(window.sessionStorage.getItem('portal_bootstrap_snapshot')).toBeTruthy();
    expect(await getPortalBootstrapSnapshot({ forceRefresh: false })).toMatchObject({
      status: 'authenticated',
      user: fallbackUser,
    });
  });
});
