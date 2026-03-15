import { useEffect, useState } from 'react';
import axios from 'axios';
import { casesApiClient } from '../../cases/api/casesApiClient';
import type { OutcomeDefinition } from '../../../types/outcomes';

interface OutcomeDefinitionsState {
  canTagOutcomes: boolean;
  outcomeDefinitions: OutcomeDefinition[];
}

let cachedOutcomeDefinitions: OutcomeDefinition[] | null = null;
let cachedPermissionDenied = false;
let inFlightRequest: Promise<OutcomeDefinitionsState> | null = null;

const getCachedState = (): OutcomeDefinitionsState | null => {
  if (cachedOutcomeDefinitions) {
    return {
      canTagOutcomes: true,
      outcomeDefinitions: cachedOutcomeDefinitions,
    };
  }

  if (cachedPermissionDenied) {
    return {
      canTagOutcomes: false,
      outcomeDefinitions: [],
    };
  }

  return null;
};

const loadOutcomeDefinitions = async (): Promise<OutcomeDefinitionsState> => {
  const cachedState = getCachedState();
  if (cachedState) {
    return cachedState;
  }

  if (!inFlightRequest) {
    inFlightRequest = (async () => {
      try {
        const definitions = await casesApiClient.listOutcomeDefinitions(false);
        cachedOutcomeDefinitions = definitions.filter((definition) => definition.is_active);
        cachedPermissionDenied = false;

        return {
          canTagOutcomes: true,
          outcomeDefinitions: cachedOutcomeDefinitions,
        };
      } catch (error) {
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          cachedPermissionDenied = true;
        }

        return {
          canTagOutcomes: false,
          outcomeDefinitions: [],
        };
      } finally {
        inFlightRequest = null;
      }
    })();
  }

  return inFlightRequest;
};

export const resetOutcomeDefinitionsCache = (): void => {
  cachedOutcomeDefinitions = null;
  cachedPermissionDenied = false;
  inFlightRequest = null;
};

export function useOutcomeDefinitions() {
  const cachedState = getCachedState();
  const [outcomeDefinitions, setOutcomeDefinitions] = useState<OutcomeDefinition[]>(
    cachedState?.outcomeDefinitions || []
  );
  const [canTagOutcomes, setCanTagOutcomes] = useState<boolean>(
    cachedState?.canTagOutcomes ?? true
  );
  const [loading, setLoading] = useState(!cachedState);

  useEffect(() => {
    if (cachedState) {
      return;
    }

    let cancelled = false;

    const hydrateDefinitions = async () => {
      const loadedState = await loadOutcomeDefinitions();
      if (cancelled) {
        return;
      }

      setOutcomeDefinitions(loadedState.outcomeDefinitions);
      setCanTagOutcomes(loadedState.canTagOutcomes);
      setLoading(false);
    };

    void hydrateDefinitions();

    return () => {
      cancelled = true;
    };
  }, [cachedState]);

  return {
    canTagOutcomes,
    loading,
    outcomeDefinitions,
  };
}
