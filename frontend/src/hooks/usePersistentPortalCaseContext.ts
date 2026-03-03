import { useCallback, useState } from 'react';

const STORAGE_KEY = 'portal:selectedCaseId';

interface UsePersistentPortalCaseContextReturn {
  selectedCaseId: string;
  setSelectedCaseId: (value: string) => void;
  clearSelectedCaseId: () => void;
}

export function usePersistentPortalCaseContext(): UsePersistentPortalCaseContextReturn {
  const [selectedCaseId, setSelectedCaseIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const setSelectedCaseId = useCallback((value: string) => {
    setSelectedCaseIdState(value);
    try {
      if (!value) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore local storage failures
    }
  }, []);

  const clearSelectedCaseId = useCallback(() => {
    setSelectedCaseId('');
  }, [setSelectedCaseId]);

  return {
    selectedCaseId,
    setSelectedCaseId,
    clearSelectedCaseId,
  };
}

export default usePersistentPortalCaseContext;
