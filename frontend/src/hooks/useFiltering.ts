/**
 * useFiltering Hook
 * Manages filter state and persistence across sessions
 */

import { useState, useCallback, useEffect } from 'react';

interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: Date;
}

interface UseFilteringReturn {
  filters: Record<string, unknown>;
  updateFilter: (key: string, value: unknown) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  setFilters: (filters: Record<string, unknown>) => void;
  savePreset: (name: string) => FilterPreset;
  loadPreset: (preset: FilterPreset) => void;
  deletePreset: (presetId: string) => void;
  presets: FilterPreset[];
  getActiveFilterCount: () => number;
}



export const useFiltering = (
  initialFilters: Record<string, unknown> = {},
  storageKey?: string
): UseFilteringReturn => {
  const [filters, setFilterState] = useState<Record<string, unknown>>(
    initialFilters
  );
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  // Load presets from localStorage on mount
  useEffect(() => {
    if (storageKey) {
      const savedPresets = localStorage.getItem(storageKey);
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }
    }
  }, [storageKey]);

  const updateFilter = useCallback((key: string, value: unknown) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilterState((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterState(initialFilters);
  }, [initialFilters]);

  const setFilters = useCallback((newFilters: Record<string, unknown>) => {
    setFilterState(newFilters);
  }, []);

  const getActiveFilterCount = useCallback((): number => {
    return Object.values(filters).filter(
      (v) => v !== null && v !== '' && v !== undefined
    ).length;
  }, [filters]);

  const savePreset = useCallback(
    (name: string): FilterPreset => {
      const preset: FilterPreset = {
        id: `preset_${Date.now()}`,
        name,
        filters: { ...filters },
        createdAt: new Date(),
      };

      const newPresets = [...presets, preset];
      setPresets(newPresets);

      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(newPresets));
      }

      return preset;
    },
    [filters, presets, storageKey]
  );

  const loadPreset = useCallback((preset: FilterPreset) => {
    setFilterState(preset.filters);
  }, []);

  const deletePreset = useCallback(
    (presetId: string) => {
      const newPresets = presets.filter((p) => p.id !== presetId);
      setPresets(newPresets);

      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(newPresets));
      }
    },
    [presets, storageKey]
  );

  return {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    setFilters,
    savePreset,
    loadPreset,
    deletePreset,
    presets,
    getActiveFilterCount,
  };
};
