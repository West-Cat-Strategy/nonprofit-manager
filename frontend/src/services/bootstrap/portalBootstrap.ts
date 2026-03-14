import portalApi from '../portalApi';
import type { PortalUser } from '../../features/portalAuth/state';

export type PortalBootstrapStatus = 'authenticated' | 'anonymous';

export interface PortalBootstrapSnapshot {
  status: PortalBootstrapStatus;
  user: PortalUser | null;
  fetchedAt: number;
}

type PortalBootstrapResponse = {
  user?: Record<string, unknown>;
  id?: string;
  email?: string;
  contactId?: string | null;
  contact_id?: string | null;
};

const PORTAL_BOOTSTRAP_TTL_MS = 60_000;
const portalBootstrapMode = import.meta.env.VITE_UI_PORTAL_BOOTSTRAP_MODE as
  | 'anonymous'
  | 'authenticated'
  | undefined;
const mockPortalUser: PortalUser = {
  id: 'ui-preview-portal',
  email: 'preview.portal@example.org',
  contactId: null,
};

let cachedSnapshot: PortalBootstrapSnapshot | null = null;
let inFlightSnapshot: Promise<PortalBootstrapSnapshot> | null = null;

const isFresh = (snapshot: PortalBootstrapSnapshot): boolean =>
  Date.now() - snapshot.fetchedAt < PORTAL_BOOTSTRAP_TTL_MS;

const normalizePortalUser = (payload: Record<string, unknown>): PortalUser | null => {
  const userPayload =
    payload.user && typeof payload.user === 'object' && !Array.isArray(payload.user)
      ? (payload.user as Record<string, unknown>)
      : payload;

  const id = typeof userPayload.id === 'string' ? userPayload.id : '';
  const email = typeof userPayload.email === 'string' ? userPayload.email : '';

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    contactId:
      typeof userPayload.contactId === 'string'
        ? userPayload.contactId
        : typeof userPayload.contact_id === 'string'
          ? userPayload.contact_id
          : null,
  };
};

const fetchPortalBootstrapSnapshot = async (): Promise<PortalBootstrapSnapshot> => {
  if (portalBootstrapMode === 'anonymous') {
    return {
      status: 'anonymous',
      user: null,
      fetchedAt: Date.now(),
    };
  }

  if (portalBootstrapMode === 'authenticated') {
    return {
      status: 'authenticated',
      user: mockPortalUser,
      fetchedAt: Date.now(),
    };
  }

  try {
    const response = await portalApi.get<PortalBootstrapResponse>('/portal/auth/bootstrap');
    const user = normalizePortalUser((response.data || {}) as Record<string, unknown>);
    if (!user) {
      return {
        status: 'anonymous',
        user: null,
        fetchedAt: Date.now(),
      };
    }

    return {
      status: 'authenticated',
      user,
      fetchedAt: Date.now(),
    };
  } catch {
    return {
      status: 'anonymous',
      user: null,
      fetchedAt: Date.now(),
    };
  }
};

export const getPortalBootstrapSnapshot = async (options?: {
  forceRefresh?: boolean;
  fallbackUser?: PortalUser | null;
}): Promise<PortalBootstrapSnapshot> => {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && cachedSnapshot && isFresh(cachedSnapshot)) {
    return cachedSnapshot;
  }

  if (!forceRefresh && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  const request = fetchPortalBootstrapSnapshot();
  inFlightSnapshot = request;

  try {
    let snapshot = await request;
    if (!snapshot.user && options?.fallbackUser) {
      snapshot = setPortalBootstrapSnapshot(options.fallbackUser);
    }
    cachedSnapshot = snapshot;
    return snapshot;
  } finally {
    if (inFlightSnapshot === request) {
      inFlightSnapshot = null;
    }
  }
};

export const setPortalBootstrapSnapshot = (user: PortalUser | null): PortalBootstrapSnapshot => {
  cachedSnapshot = {
    status: user ? 'authenticated' : 'anonymous',
    user,
    fetchedAt: Date.now(),
  };
  return cachedSnapshot;
};

export const clearPortalBootstrapSnapshot = (): void => {
  cachedSnapshot = null;
  inFlightSnapshot = null;
};
