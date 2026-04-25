import { useCallback, useEffect, useState } from 'react';
import type { CaseFilter, CasePriority } from '../../../types/case';
import type { CaseListFilterOverrides, QuickFilter } from './useCaseListQueryState';
import { queueViewsApiClient } from '../api/queueViewsApiClient';
import type { QueueViewDefinition } from '../api/queueViewsApiClient';

export interface SavedCaseView {
  id: string;
  name: string;
  filters: CaseFilter;
  quickFilter: QuickFilter;
  serverBacked?: boolean;
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
const HIDDEN_SERVER_VIEWS_KEY = 'cases.hiddenServerViews';

const isQuickFilter = (value: unknown): value is QuickFilter =>
  value === 'all' ||
  value === 'active' ||
  value === 'overdue' ||
  value === 'due_soon' ||
  value === 'unassigned' ||
  value === 'urgent';

const isStoredQuickFilter = (value: unknown): value is Exclude<QuickFilter, 'all'> =>
  value === 'active' ||
  value === 'overdue' ||
  value === 'due_soon' ||
  value === 'unassigned' ||
  value === 'urgent';

const parseStoredViews = (): SavedCaseView[] => {
  try {
    const stored = localStorage.getItem(SAVED_VIEWS_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as SavedCaseView[];
  } catch {
    return [];
  }
};

const persistLocalViews = (views: SavedCaseView[]) => {
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
  } catch {
    // Ignore storage failures and keep the in-memory copy.
  }
};

const readHiddenServerViewIds = (): string[] => {
  try {
    const stored = localStorage.getItem(HIDDEN_SERVER_VIEWS_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
};

const hideServerViewId = (viewId: string) => {
  const ids = new Set(readHiddenServerViewIds());
  ids.add(viewId);
  try {
    localStorage.setItem(HIDDEN_SERVER_VIEWS_KEY, JSON.stringify([...ids]));
  } catch {
    // Local tombstones are best-effort only.
  }
};

const asCaseFilters = (filters: Record<string, unknown>): CaseFilter => ({
  search: typeof filters.search === 'string' ? filters.search : undefined,
  contact_id: typeof filters.contact_id === 'string' ? filters.contact_id : undefined,
  account_id: typeof filters.account_id === 'string' ? filters.account_id : undefined,
  priority: typeof filters.priority === 'string' ? (filters.priority as CasePriority) : undefined,
  status_id: typeof filters.status_id === 'string' ? filters.status_id : undefined,
  case_type_id: typeof filters.case_type_id === 'string' ? filters.case_type_id : undefined,
  assigned_to: typeof filters.assigned_to === 'string' ? filters.assigned_to : undefined,
  is_urgent: typeof filters.is_urgent === 'boolean' ? filters.is_urgent : undefined,
  imported_only: typeof filters.imported_only === 'boolean' ? filters.imported_only : undefined,
  sort_by: typeof filters.sort_by === 'string' ? filters.sort_by : undefined,
  sort_order: filters.sort_order === 'asc' || filters.sort_order === 'desc' ? filters.sort_order : undefined,
  quick_filter: isStoredQuickFilter(filters.quick_filter) ? filters.quick_filter : undefined,
  due_within_days: typeof filters.due_within_days === 'number' ? filters.due_within_days : undefined,
  limit: typeof filters.limit === 'number' ? filters.limit : undefined,
});

const fromServerQueueView = (view: QueueViewDefinition): SavedCaseView => {
  const filters = asCaseFilters(view.filters);
  const quickFilter = isQuickFilter(filters.quick_filter) ? filters.quick_filter : 'all';
  return {
    id: view.id,
    name: view.name,
    filters: {
      ...filters,
      limit: filters.limit ?? view.rowLimit,
    },
    quickFilter,
    serverBacked: true,
  };
};

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
  const [savedViewsLoading, setSavedViewsLoading] = useState(true);
  const [savedViewsError, setSavedViewsError] = useState<string | null>(null);
  const [savedViewsUsingLocalFallback, setSavedViewsUsingLocalFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSavedViews = async () => {
      setSavedViewsLoading(true);
      try {
        const hiddenIds = new Set(readHiddenServerViewIds());
        const serverViews = (await queueViewsApiClient.listQueueViews('cases'))
          .map(fromServerQueueView)
          .filter((view) => !hiddenIds.has(view.id));
        if (cancelled) {
          return;
        }
        setSavedViews(serverViews);
        persistLocalViews(serverViews);
        setSavedViewsError(null);
        setSavedViewsUsingLocalFallback(false);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setSavedViews(parseStoredViews());
        setSavedViewsError('Server saved views are unavailable. Local saved views are being used on this device.');
        setSavedViewsUsingLocalFallback(true);
      } finally {
        if (!cancelled) {
          setSavedViewsLoading(false);
        }
      }
    };

    void loadSavedViews();

    return () => {
      cancelled = true;
    };
  }, []);

  const persistSavedViews = useCallback((views: SavedCaseView[]) => {
    setSavedViews(views);
    persistLocalViews(views);
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
        limit: filters.limit,
      },
    };

    const optimisticViews = [newView, ...savedViews];
    persistSavedViews(optimisticViews);
    setSavedViewName('');
    setSelectedViewId(newView.id);

    void queueViewsApiClient
      .saveQueueView({
        surface: 'cases',
        name: newView.name,
        filters: { ...newView.filters },
        sort: {
          sort_by: newView.filters.sort_by,
          sort_order: newView.filters.sort_order,
        },
        rowLimit: newView.filters.limit,
      })
      .then((serverView) => {
        const savedView = fromServerQueueView(serverView);
        setSavedViews((currentViews) => {
          const nextViews = [
            savedView,
            ...currentViews.filter((view) => view.id !== newView.id && view.id !== savedView.id),
          ];
          persistLocalViews(nextViews);
          return nextViews;
        });
        setSelectedViewId(savedView.id);
        setSavedViewsError(null);
        setSavedViewsUsingLocalFallback(false);
      })
      .catch(() => {
        setSavedViewsError('Saved this view locally because server saved views are unavailable.');
        setSavedViewsUsingLocalFallback(true);
      });
  }, [
    dueSoonDays,
    filters.account_id,
    filters.assigned_to,
    filters.contact_id,
    filters.limit,
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

    const selectedView = savedViews.find((item) => item.id === selectedViewId);
    const updatedViews = savedViews.filter((item) => item.id !== selectedViewId);
    persistSavedViews(updatedViews);
    setSelectedViewId('');

    if (selectedView?.serverBacked) {
      void queueViewsApiClient.archiveQueueView('cases', selectedView.id).catch(() => {
        hideServerViewId(selectedView.id);
        setSavedViewsError('Removed this saved view from this device because server archiving is unavailable.');
      });
    }
  }, [persistSavedViews, savedViews, selectedViewId]);

  return {
    savedViews,
    savedViewsLoading,
    savedViewsError,
    savedViewsUsingLocalFallback,
    selectedViewId,
    setSelectedViewId,
    savedViewName,
    setSavedViewName,
    applySavedView,
    handleSaveView,
    handleDeleteView,
  };
}
