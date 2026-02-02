/**
 * Auto-Save Hook
 * Automatically saves changes after a period of inactivity
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveNow: () => Promise<void>;
  markAsSaved: () => void;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs for tracking state
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>(JSON.stringify(data));
  const currentDataRef = useRef<T>(data);
  const isMountedRef = useRef(true);

  // Update current data ref
  useEffect(() => {
    currentDataRef.current = data;
  }, [data]);

  // Check for unsaved changes
  useEffect(() => {
    const currentDataString = JSON.stringify(data);
    const hasChanges = currentDataString !== lastSavedDataRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [data]);

  // Save function
  const performSave = useCallback(async () => {
    if (!enabled || isSaving) return;

    const dataToSave = currentDataRef.current;
    const dataString = JSON.stringify(dataToSave);

    // Don't save if no changes
    if (dataString === lastSavedDataRef.current) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(dataToSave);

      if (isMountedRef.current) {
        lastSavedDataRef.current = dataString;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Don't update lastSaved on failure
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [enabled, isSaving, onSave]);

  // Manual save function
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Mark current state as saved (useful after external save)
  const markAsSaved = useCallback(() => {
    lastSavedDataRef.current = JSON.stringify(currentDataRef.current);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
  }, []);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, hasUnsavedChanges, debounceMs, performSave]);

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
    markAsSaved,
  };
}

export default useAutoSave;
