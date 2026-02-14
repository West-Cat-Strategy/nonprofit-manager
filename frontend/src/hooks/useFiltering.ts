/**
 * useFiltering Hook
 * Manages filter state and persistence across sessions
 */

import { useState, useCallback, useEffect } from 'react';

interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: Date;
}

interface UseFilteringReturn {
  filters: Record<string, any>;
  updateFilter: (key: string, value: any) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  setFilters: (filters: Record<string, any>) => void;
  savePreset: (name: string) => FilterPreset;
  loadPreset: (preset: FilterPreset) => void;
  deletePreset: (presetId: string) => void;
  presets: FilterPreset[];
  getActiveFilterCount: () => number;
}

const STORAGE_KEY_PREFIX = 'filter_preset_';

export const useFiltering = (
  initialFilters: Record<string, any> = {},
  storageKey?: string
): UseFilteringReturn => {
  const [filters, setFilterState] = useState<Record<string, any>>(
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

  const updateFilter = useCallback((key: string, value: any) => {
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

  const setFilters = useCallback((newFilters: Record<string, any>) => {
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
