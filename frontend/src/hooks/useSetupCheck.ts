/**
 * useSetupCheck Hook
 * Checks if first-time setup is required
 */

import { isAxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

interface SetupStatus {
  setupRequired: boolean;
  userCount: number;
}

type SetupRequiredState = boolean | null;
type SetupStatusSnapshot = {
  setupRequired: SetupRequiredState;
  error: string | null;
  fetchedAt: number;
};

const SETUP_STATUS_CACHE_TTL_MS = 60_000;
let setupStatusSnapshot: SetupStatusSnapshot | null = null;
let setupStatusInFlightPromise: Promise<SetupStatusSnapshot> | null = null;

const isSnapshotFresh = (snapshot: SetupStatusSnapshot): boolean =>
  Date.now() - snapshot.fetchedAt < SETUP_STATUS_CACHE_TTL_MS;

const fetchSetupStatusSnapshot = async (): Promise<SetupStatusSnapshot> => {
  try {
    const response = await api.get<SetupStatus>('/auth/setup-status');
    const nextSetupRequired =
      typeof response.data?.setupRequired === 'boolean' ? response.data.setupRequired : null;
    return {
      setupRequired: nextSetupRequired,
      error: nextSetupRequired === null ? 'Setup status response was invalid.' : null,
      fetchedAt: Date.now(),
    };
  } catch (requestError) {
    return {
      setupRequired: null,
      error: getSetupStatusErrorMessage(requestError),
      fetchedAt: Date.now(),
    };
  }
};

const getSetupStatusSnapshot = async (forceRefresh = false): Promise<SetupStatusSnapshot> => {
  if (!forceRefresh && setupStatusSnapshot && isSnapshotFresh(setupStatusSnapshot)) {
    return setupStatusSnapshot;
  }

  if (!forceRefresh && setupStatusInFlightPromise) {
    return setupStatusInFlightPromise;
  }

  const requestPromise = fetchSetupStatusSnapshot();
  setupStatusInFlightPromise = requestPromise;

  try {
    const snapshot = await requestPromise;
    setupStatusSnapshot = snapshot;
    return snapshot;
  } finally {
    if (setupStatusInFlightPromise === requestPromise) {
      setupStatusInFlightPromise = null;
    }
  }
};

const getSetupStatusErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (typeof error.response?.data === 'object' && error.response?.data) {
      const payload = error.response.data as {
        error?: { message?: string };
        message?: string;
      };
      if (typeof payload.error?.message === 'string') {
        return payload.error.message;
      }
      if (typeof payload.message === 'string') {
        return payload.message;
      }
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to check setup status.';
};

interface UseSetupCheckOptions {
  enabled?: boolean;
}

export const useSetupCheck = (options?: UseSetupCheckOptions) => {
  const enabled = options?.enabled !== false;
  const cachedSnapshot =
    enabled && setupStatusSnapshot && isSnapshotFresh(setupStatusSnapshot)
      ? setupStatusSnapshot
      : null;
  const [setupRequired, setSetupRequired] = useState<SetupRequiredState>(
    cachedSnapshot?.setupRequired ?? null
  );
  const [loading, setLoading] = useState(enabled && !cachedSnapshot);
  const [error, setError] = useState<string | null>(cachedSnapshot?.error ?? null);

  const applySnapshot = useCallback((snapshot: SetupStatusSnapshot) => {
    setSetupRequired(snapshot.setupRequired);
    setError(snapshot.error);
  }, []);

  const refreshSetupStatus = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      if (!enabled) {
        setLoading(false);
        setError(null);
        setSetupRequired(null);
        return;
      }

      setLoading(true);
      try {
        const snapshot = await getSetupStatusSnapshot(Boolean(options?.forceRefresh));
        applySnapshot(snapshot);
      } finally {
        setLoading(false);
      }
    },
    [applySnapshot, enabled]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setSetupRequired(null);
      return;
    }

    if (cachedSnapshot) {
      return;
    }

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const snapshot = await getSetupStatusSnapshot();
        if (isMounted) {
          applySnapshot(snapshot);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [applySnapshot, cachedSnapshot, enabled]);

  return { setupRequired, loading, error, refreshSetupStatus };
};

export const __resetSetupStatusCacheForTests = (): void => {
  setupStatusSnapshot = null;
  setupStatusInFlightPromise = null;
};
