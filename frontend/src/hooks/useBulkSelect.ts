/**
 * useBulkSelect Hook
 * Manages selection state for bulk operations on list pages
 */

import { useState, useCallback } from 'react';

interface UseBulkSelectReturn {
  selectedIds: Set<string>;
  selectedCount: number;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  selectRow: (id: string) => void;
  deselectRow: (id: string) => void;
  toggleRow: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  toggleAll: (ids: string[]) => void;
  setSelected: (ids: string[]) => void;
  getSelected: () => string[];
}

export const useBulkSelect = (): UseBulkSelectReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectRow = useCallback((id: string) => {
    setSelectedIds((prev) => new Set([...prev, id]));
  }, []);

  const deselectRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (prev.size === ids.length) {
        return new Set();
      }
      return new Set(ids);
    });
  }, []);

  const setSelected = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const getSelected = useCallback((): string[] => {
    return Array.from(selectedIds);
  }, [selectedIds]);

  const selectedCount = selectedIds.size;

  return {
    selectedIds,
    selectedCount,
    isAllSelected: selectedIds.size > 0,
    isSomeSelected: selectedIds.size > 0,
    selectRow,
    deselectRow,
    toggleRow,
    selectAll,
    deselectAll,
    toggleAll,
    setSelected,
    getSelected,
  };
};
