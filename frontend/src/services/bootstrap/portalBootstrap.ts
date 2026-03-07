import portalApi from '../portalApi';
import type { PortalUser } from '../../features/portalAuth/state';

export type PortalBootstrapStatus = 'authenticated' | 'anonymous';

export interface PortalBootstrapSnapshot {
  status: PortalBootstrapStatus;
  user: PortalUser | null;
  fetchedAt: number;
}

const PORTAL_BOOTSTRAP_TTL_MS = 60_000;

let cachedSnapshot: PortalBootstrapSnapshot | null = null;
let inFlightSnapshot: Promise<PortalBootstrapSnapshot> | null = null;

const isFresh = (snapshot: PortalBootstrapSnapshot): boolean =>
  Date.now() - snapshot.fetchedAt < PORTAL_BOOTSTRAP_TTL_MS;

const normalizePortalUser = (payload: Record<string, unknown>): PortalUser => ({
  id: String(payload.id || ''),
  email: String(payload.email || ''),
  contactId: typeof payload.contact_id === 'string' ? payload.contact_id : null,
});

const fetchPortalBootstrapSnapshot = async (): Promise<PortalBootstrapSnapshot> => {
  try {
    const response = await portalApi.get('/portal/auth/me');
    return {
      status: 'authenticated',
      user: normalizePortalUser((response.data || {}) as Record<string, unknown>),
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
    const snapshot = await request;
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
