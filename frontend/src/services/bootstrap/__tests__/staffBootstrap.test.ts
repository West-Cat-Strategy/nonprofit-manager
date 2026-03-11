import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../api';
import {
  clearStaffBootstrapSnapshot,
  getStaffBootstrapSnapshot,
} from '../staffBootstrap';

describe('staffBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStaffBootstrapSnapshot();
  });

  it('captures organizationId from /auth/me during auth bootstrap', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 'user-1',
          email: 'bootstrap@example.com',
          firstName: 'Bootstrap',
          lastName: 'User',
          role: 'admin',
          profilePicture: null,
          organizationId: 'org-1',
        },
      },
    });

    const snapshot = await getStaffBootstrapSnapshot({ forceRefresh: true });

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(snapshot).toMatchObject({
      status: 'authenticated',
      organizationId: 'org-1',
      user: {
        id: 'user-1',
        email: 'bootstrap@example.com',
      },
    });
  });
});
