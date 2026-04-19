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
const PORTAL_BOOTSTRAP_STORAGE_KEY = 'portal_bootstrap_snapshot';
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

const isGuestPortalRoute = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.location.pathname.startsWith('/portal/login') ||
    window.location.pathname.startsWith('/portal/signup') ||
    window.location.pathname.startsWith('/portal/forgot-password') ||
    window.location.pathname.startsWith('/portal/reset-password') ||
    window.location.pathname.startsWith('/portal/accept-invitation')
  );
};

const readPortalBootstrapSnapshotFromStorage = (): PortalBootstrapSnapshot | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PORTAL_BOOTSTRAP_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PortalBootstrapSnapshot>;
    if (
      typeof parsed.fetchedAt !== 'number' ||
      (parsed.status !== 'authenticated' && parsed.status !== 'anonymous')
    ) {
      return null;
    }

    if (parsed.status === 'authenticated') {
      const user = parsed.user;
      if (!user || typeof user !== 'object') {
        return null;
      }
      const candidate = user as PortalUser;
      if (
        typeof candidate.id !== 'string' ||
        candidate.id.length === 0 ||
        typeof candidate.email !== 'string' ||
        candidate.email.length === 0
      ) {
        return null;
      }
    }

    return parsed as PortalBootstrapSnapshot;
  } catch {
    return null;
  }
};

const persistPortalBootstrapSnapshot = (snapshot: PortalBootstrapSnapshot): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (snapshot.status === 'authenticated' && snapshot.user) {
      window.sessionStorage.setItem(PORTAL_BOOTSTRAP_STORAGE_KEY, JSON.stringify(snapshot));
    } else {
      window.sessionStorage.removeItem(PORTAL_BOOTSTRAP_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures; in-memory cache still serves the current tab.
  }
};

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
  if (isGuestPortalRoute()) {
    return {
      status: 'anonymous',
      user: null,
      fetchedAt: Date.now(),
    };
  }

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

  if (options?.fallbackUser) {
    return setPortalBootstrapSnapshot(options.fallbackUser);
  }

  if (!forceRefresh && cachedSnapshot && isFresh(cachedSnapshot)) {
    return cachedSnapshot;
  }

  if (!forceRefresh && !cachedSnapshot) {
    const storedSnapshot = readPortalBootstrapSnapshotFromStorage();
    if (storedSnapshot?.status === 'authenticated' && isFresh(storedSnapshot)) {
      cachedSnapshot = storedSnapshot;
      return cachedSnapshot;
    }
  }

  if (!forceRefresh && isGuestPortalRoute()) {
    return {
      status: 'anonymous',
      user: null,
      fetchedAt: Date.now(),
    };
  }

  if (!forceRefresh && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  const request = fetchPortalBootstrapSnapshot();
  inFlightSnapshot = request;

  try {
    const snapshot = await request;
    if (snapshot.user) {
      cachedSnapshot = snapshot;
      persistPortalBootstrapSnapshot(snapshot);
      return snapshot;
    }

    cachedSnapshot = snapshot;
    persistPortalBootstrapSnapshot(snapshot);
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
  persistPortalBootstrapSnapshot(cachedSnapshot);
  return cachedSnapshot;
};

export const clearPortalBootstrapSnapshot = (): void => {
  cachedSnapshot = null;
  inFlightSnapshot = null;
  persistPortalBootstrapSnapshot({
    status: 'anonymous',
    user: null,
    fetchedAt: Date.now(),
  });
};

export const __setPortalBootstrapSnapshotForTests = (
  snapshot: PortalBootstrapSnapshot | null
): void => {
  if (snapshot) {
    cachedSnapshot = snapshot;
    persistPortalBootstrapSnapshot(snapshot);
    return;
  }

  clearPortalBootstrapSnapshot();
};

export const __seedPortalBootstrapSnapshotStorageForTests = (
  snapshot: PortalBootstrapSnapshot | null
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!snapshot) {
    window.sessionStorage.removeItem(PORTAL_BOOTSTRAP_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(PORTAL_BOOTSTRAP_STORAGE_KEY, JSON.stringify(snapshot));
};
