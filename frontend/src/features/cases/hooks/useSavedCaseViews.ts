import { useCallback, useEffect, useState } from 'react';
import type { CaseFilter, CasePriority } from '../../../types/case';
import type { CaseListFilterOverrides, QuickFilter } from './useCaseListQueryState';

export interface SavedCaseView {
  id: string;
  name: string;
  filters: CaseFilter;
  quickFilter: QuickFilter;
}

interface UseSavedCaseViewsArgs {
  filters: CaseFilter;
  searchTerm: string;
  selectedPriority: CasePriority | '';
  selectedStatus: string;
  selectedType: string;
  showUrgentOnly: boolean;
  showImportedOnly: boolean;
  selectedSort: string;
  selectedOrder: 'asc' | 'desc';
  quickFilter: QuickFilter;
  dueSoonDays: number;
  applyFilters: (overrides?: CaseListFilterOverrides) => void;
}

const SAVED_VIEWS_KEY = 'cases.savedViews';

export function useSavedCaseViews({
  filters,
  searchTerm,
  selectedPriority,
  selectedStatus,
  selectedType,
  showUrgentOnly,
  showImportedOnly,
  selectedSort,
  selectedOrder,
  quickFilter,
  dueSoonDays,
  applyFilters,
}: UseSavedCaseViewsArgs) {
  const [savedViews, setSavedViews] = useState<SavedCaseView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [savedViewName, setSavedViewName] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_VIEWS_KEY);
      if (stored) {
        setSavedViews(JSON.parse(stored));
      }
    } catch {
      setSavedViews([]);
    }
  }, []);

  const persistSavedViews = useCallback((views: SavedCaseView[]) => {
    setSavedViews(views);

    try {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
    } catch {
      // Ignore storage failures and keep the in-memory copy.
    }
  }, []);

  const applySavedView = useCallback(
    (viewId: string) => {
      const view = savedViews.find((item) => item.id === viewId);
      if (!view) {
        return;
      }

      setSelectedViewId(viewId);
      applyFilters({
        search: view.filters.search || '',
        priority: view.filters.priority || '',
        status: view.filters.status_id || '',
        type: view.filters.case_type_id || '',
        isUrgent: view.filters.is_urgent || false,
        importedOnly: view.filters.imported_only || false,
        sortBy: view.filters.sort_by || 'created_at',
        sortOrder: view.filters.sort_order || 'desc',
        quickFilter: view.quickFilter,
        dueSoonDays: view.filters.due_within_days || 7,
        page: 1,
        limit: view.filters.limit,
      });
    },
    [applyFilters, savedViews]
  );

  const handleSaveView = useCallback(() => {
    const trimmedName = savedViewName.trim();
    if (!trimmedName) {
      return;
    }

    const newView: SavedCaseView = {
      id: `${Date.now()}`,
      name: trimmedName,
      quickFilter,
      filters: {
        search: searchTerm.trim() || undefined,
        contact_id: filters.contact_id || undefined,
        account_id: filters.account_id || undefined,
        priority: selectedPriority || undefined,
        status_id: selectedStatus || undefined,
        case_type_id: selectedType || undefined,
        assigned_to: filters.assigned_to || undefined,
        is_urgent: showUrgentOnly || undefined,
        imported_only: showImportedOnly || undefined,
        sort_by: selectedSort,
        sort_order: selectedOrder,
        quick_filter: quickFilter === 'all' ? undefined : quickFilter,
        due_within_days: quickFilter === 'due_soon' ? dueSoonDays : undefined,
      },
    };

    persistSavedViews([newView, ...savedViews]);
    setSavedViewName('');
    setSelectedViewId(newView.id);
  }, [
    dueSoonDays,
    filters.account_id,
    filters.assigned_to,
    filters.contact_id,
    persistSavedViews,
    quickFilter,
    savedViewName,
    savedViews,
    searchTerm,
    selectedOrder,
    selectedPriority,
    selectedSort,
    selectedStatus,
    selectedType,
    showImportedOnly,
    showUrgentOnly,
  ]);

  const handleDeleteView = useCallback(() => {
    if (!selectedViewId) {
      return;
    }

    const updatedViews = savedViews.filter((item) => item.id !== selectedViewId);
    persistSavedViews(updatedViews);
    setSelectedViewId('');
  }, [persistSavedViews, savedViews, selectedViewId]);

  return {
    savedViews,
    selectedViewId,
    setSelectedViewId,
    savedViewName,
    setSavedViewName,
    applySavedView,
    handleSaveView,
    handleDeleteView,
  };
}
