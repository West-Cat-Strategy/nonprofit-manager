import api from '../api';
import { unwrapApiData, type ApiEnvelope } from '../apiEnvelope';
import type { User } from '../../features/auth/state';
import type { CurrentUserResponse } from '../authService';

export type BootstrapStatus = 'authenticated' | 'anonymous';

export interface StaffBootstrapSnapshot {
  status: BootstrapStatus;
  user: User | null;
  organizationId: string | null;
  fetchedAt: number;
}

const STAFF_BOOTSTRAP_TTL_MS = 60_000;
const staffBootstrapMode = import.meta.env.VITE_UI_STAFF_BOOTSTRAP_MODE as
  | 'anonymous'
  | 'authenticated'
  | undefined;
const mockStaffUser: User = {
  id: 'ui-preview-staff',
  email: 'preview.staff@example.org',
  firstName: 'Preview',
  lastName: 'Staff',
  role: 'admin',
  profilePicture: null,
};

let cachedSnapshot: StaffBootstrapSnapshot | null = null;
let inFlightSnapshot: Promise<StaffBootstrapSnapshot> | null = null;

const isFresh = (snapshot: StaffBootstrapSnapshot): boolean =>
  Date.now() - snapshot.fetchedAt < STAFF_BOOTSTRAP_TTL_MS;

const fetchStaffBootstrapSnapshot = async (): Promise<StaffBootstrapSnapshot> => {
  if (staffBootstrapMode === 'anonymous') {
    return {
      status: 'anonymous',
      user: null,
      organizationId: null,
      fetchedAt: Date.now(),
    };
  }

  if (staffBootstrapMode === 'authenticated') {
    return {
      status: 'authenticated',
      user: mockStaffUser,
      organizationId: null,
      fetchedAt: Date.now(),
    };
  }

  try {
    const response = await api.get<ApiEnvelope<CurrentUserResponse>>('/auth/me');
    const payload = unwrapApiData(response.data) as CurrentUserResponse;
    return {
      status: 'authenticated',
      user: payload,
      organizationId: payload.organizationId ?? null,
      fetchedAt: Date.now(),
    };
  } catch {
    return {
      status: 'anonymous',
      user: null,
      organizationId: null,
      fetchedAt: Date.now(),
    };
  }
};

export const getStaffBootstrapSnapshot = async (options?: {
  forceRefresh?: boolean;
}): Promise<StaffBootstrapSnapshot> => {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && cachedSnapshot && isFresh(cachedSnapshot)) {
    return cachedSnapshot;
  }

  if (!forceRefresh && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  const request = fetchStaffBootstrapSnapshot();
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

export const setStaffBootstrapSnapshot = (input: {
  user: User | null;
  organizationId?: string | null;
}): StaffBootstrapSnapshot => {
  cachedSnapshot = {
    status: input.user ? 'authenticated' : 'anonymous',
    user: input.user,
    organizationId: input.organizationId ?? null,
    fetchedAt: Date.now(),
  };
  return cachedSnapshot;
};

export const clearStaffBootstrapSnapshot = (): void => {
  cachedSnapshot = null;
  inFlightSnapshot = null;
};
