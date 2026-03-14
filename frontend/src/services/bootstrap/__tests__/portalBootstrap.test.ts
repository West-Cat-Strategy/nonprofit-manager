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
} from '../portalBootstrap';

describe('portalBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPortalBootstrapSnapshot();
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
});
