import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/portalApi', () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error('No portal session')),
    post: vi.fn(),
  },
}));

import portalAuthReducer, {
  portalLogout,
  portalSessionSynced,
  type PortalUser,
} from './portalAuthCore';
import {
  clearPortalBootstrapSnapshot,
  getPortalBootstrapSnapshot,
} from '../../../services/bootstrap/portalBootstrap';

describe('portalAuth reducer session bootstrap behavior', () => {
  const user: PortalUser = {
    id: 'portal-user-1',
    email: 'portal@example.org',
    contactId: 'contact-1',
  };

  beforeEach(() => {
    clearPortalBootstrapSnapshot();
    window.sessionStorage.clear();
  });

  it('syncs authenticated portal users into the bootstrap cache', async () => {
    const state = portalAuthReducer(undefined, portalSessionSynced(user));

    expect(state).toMatchObject({
      token: null,
      user,
      error: null,
    });
    expect(window.sessionStorage.getItem('portal_bootstrap_snapshot')).toContain(
      'portal@example.org'
    );
    await expect(getPortalBootstrapSnapshot()).resolves.toMatchObject({
      status: 'authenticated',
      user,
    });
  });

  it('clears portal user state and cached bootstrap snapshots on logout', async () => {
    const authenticatedState = portalAuthReducer(undefined, portalSessionSynced(user));
    const loggedOutState = portalAuthReducer(authenticatedState, portalLogout());

    expect(loggedOutState).toMatchObject({
      token: null,
      user: null,
      error: null,
    });
    expect(window.sessionStorage.getItem('portal_bootstrap_snapshot')).toBeNull();
    await expect(getPortalBootstrapSnapshot()).resolves.toMatchObject({
      status: 'anonymous',
      user: null,
    });
  });
});
