import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import type { AppDispatch } from '../../../store';
import { clearCaseSelection, clearFilters, setFilters } from '../state';
import type { CaseFilter, CasePriority } from '../../../types/case';

export type QuickFilter = 'all' | 'active' | 'overdue' | 'due_soon' | 'unassigned' | 'urgent';

export interface CaseListFilterOverrides {
  search?: string;
  priority?: CasePriority | '';
  status?: string;
  type?: string;
  isUrgent?: boolean;
  importedOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  quickFilter?: QuickFilter;
  dueSoonDays?: number;
  page?: number;
  limit?: number;
}

interface UseCaseListQueryStateArgs {
  dispatch: AppDispatch;
  initialFiltersFromStore: CaseFilter;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}

interface ParsedCaseListQueryState {
  hasParams: boolean;
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
}

const DEFAULT_CASE_LIST_FILTERS: CaseFilter = {
  page: 1,
  limit: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
};

const QUICK_FILTER_VALUES = new Set<QuickFilter>([
  'all',
  'active',
  'overdue',
  'due_soon',
  'unassigned',
  'urgent',
]);

const parseBoolean = (value: string | null): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeCaseFilters = (filters: Partial<CaseFilter> = {}): CaseFilter => ({
  ...DEFAULT_CASE_LIST_FILTERS,
  ...filters,
});

const parseCaseListSearchParams = (searchParams: URLSearchParams): ParsedCaseListQueryState => {
  const statusParam = searchParams.get('status');
  const statusIdParam = searchParams.get('status_id');
  const legacyQuickFilterMap: Partial<Record<string, QuickFilter>> = {
    active: 'active',
    urgent: 'urgent',
    unassigned: 'unassigned',
    overdue: 'overdue',
  };
  const initialQuickFilter =
    (searchParams.get('quick_filter') || legacyQuickFilterMap[statusParam || '']) ?? 'all';
  const quickFilter = QUICK_FILTER_VALUES.has(initialQuickFilter as QuickFilter)
    ? (initialQuickFilter as QuickFilter)
    : 'all';
  const dueWithin = parseNumber(searchParams.get('due_within_days'));
  const importedOnly = parseBoolean(searchParams.get('imported_only'));
  const initialFilters: CaseFilter = normalizeCaseFilters({
    search: searchParams.get('search') || undefined,
    contact_id: searchParams.get('contact_id') || undefined,
    account_id: searchParams.get('account_id') || undefined,
    priority: (searchParams.get('priority') as CaseFilter['priority']) || undefined,
    status_id:
      statusIdParam || (statusParam && !legacyQuickFilterMap[statusParam] ? statusParam : undefined),
    case_type_id: searchParams.get('type') || searchParams.get('case_type_id') || undefined,
    assigned_to: searchParams.get('assigned_to') || undefined,
    is_urgent: parseBoolean(searchParams.get('is_urgent')),
    imported_only: importedOnly,
    sort_by: searchParams.get('sort_by') || undefined,
    sort_order: (searchParams.get('sort_order') as CaseFilter['sort_order']) || undefined,
    page: parseNumber(searchParams.get('page')) || DEFAULT_CASE_LIST_FILTERS.page,
    limit: parseNumber(searchParams.get('limit')) || DEFAULT_CASE_LIST_FILTERS.limit,
    quick_filter: quickFilter === 'all' ? undefined : quickFilter,
    due_within_days: quickFilter === 'due_soon' ? dueWithin : undefined,
  });

  return {
    hasParams: Array.from(searchParams.keys()).length > 0,
    filters: initialFilters,
    searchTerm: initialFilters.search || '',
    selectedPriority: initialFilters.priority || '',
    selectedStatus: initialFilters.status_id || '',
    selectedType: initialFilters.case_type_id || '',
    showUrgentOnly: initialFilters.is_urgent || false,
    showImportedOnly: initialFilters.imported_only || false,
    selectedSort: initialFilters.sort_by || DEFAULT_CASE_LIST_FILTERS.sort_by || 'created_at',
    selectedOrder: initialFilters.sort_order || DEFAULT_CASE_LIST_FILTERS.sort_order || 'desc',
    quickFilter,
    dueSoonDays: typeof dueWithin === 'number' && dueWithin > 0 ? dueWithin : 7,
  };
};

export const getDefaultCaseListFilters = (): CaseFilter => ({ ...DEFAULT_CASE_LIST_FILTERS });

export function useCaseListQueryState({
  dispatch,
  initialFiltersFromStore,
  searchParams,
  setSearchParams,
}: UseCaseListQueryStateArgs) {
  const initialQueryStateRef = useRef<ParsedCaseListQueryState | null>(null);
  if (!initialQueryStateRef.current) {
    const parsedQueryState = parseCaseListSearchParams(searchParams);
    initialQueryStateRef.current = parsedQueryState.hasParams
      ? parsedQueryState
      : {
          ...parsedQueryState,
          filters: normalizeCaseFilters(initialFiltersFromStore),
          searchTerm: initialFiltersFromStore.search || '',
          selectedPriority: initialFiltersFromStore.priority || '',
          selectedStatus: initialFiltersFromStore.status_id || '',
          selectedType: initialFiltersFromStore.case_type_id || '',
          showUrgentOnly: initialFiltersFromStore.is_urgent || false,
          showImportedOnly: initialFiltersFromStore.imported_only || false,
          selectedSort:
            initialFiltersFromStore.sort_by || DEFAULT_CASE_LIST_FILTERS.sort_by || 'created_at',
          selectedOrder:
            initialFiltersFromStore.sort_order || DEFAULT_CASE_LIST_FILTERS.sort_order || 'desc',
          quickFilter:
            (initialFiltersFromStore.quick_filter as QuickFilter | undefined) || 'all',
          dueSoonDays:
            initialFiltersFromStore.quick_filter === 'due_soon'
              ? initialFiltersFromStore.due_within_days || 7
              : 7,
        };
  }

  const initialQueryState = initialQueryStateRef.current;

  const [filters, setActiveFilters] = useState<CaseFilter>(() => initialQueryState.filters);
  const [searchTerm, setSearchTerm] = useState(initialQueryState.searchTerm);
  const [selectedPriority, setSelectedPriority] = useState<CasePriority | ''>(
    initialQueryState.selectedPriority
  );
  const [selectedStatus, setSelectedStatus] = useState(initialQueryState.selectedStatus);
  const [selectedType, setSelectedType] = useState(initialQueryState.selectedType);
  const [showUrgentOnly, setShowUrgentOnly] = useState(initialQueryState.showUrgentOnly);
  const [showImportedOnly, setShowImportedOnly] = useState(initialQueryState.showImportedOnly);
  const [selectedSort, setSelectedSort] = useState(initialQueryState.selectedSort);
  const [selectedOrder, setSelectedOrder] = useState<'asc' | 'desc'>(
    initialQueryState.selectedOrder
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(initialQueryState.quickFilter);
  const [dueSoonDays, setDueSoonDays] = useState(initialQueryState.dueSoonDays);

  const syncStoreFilters = useCallback(
    (nextFilters: CaseFilter) => {
      dispatch(clearFilters());
      dispatch(setFilters(nextFilters));
    },
    [dispatch]
  );

  useEffect(() => {
    if (!initialQueryState.hasParams) {
      return;
    }

    syncStoreFilters(initialQueryState.filters);
  }, [initialQueryState.filters, initialQueryState.hasParams, syncStoreFilters]);

  const syncUrl = useCallback(
    (nextFilters: CaseFilter) => {
      const params = new URLSearchParams();

      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value === undefined || value === '') {
          return;
        }

        if (key === 'status_id') {
          params.set('status', String(value));
          return;
        }

        if (key === 'case_type_id') {
          params.set('type', String(value));
          return;
        }

        params.set(key, String(value));
      });

      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  const commitFilters = useCallback(
    (nextFilters: CaseFilter) => {
      setActiveFilters(nextFilters);
      dispatch(clearCaseSelection());
      syncStoreFilters(nextFilters);
      syncUrl(nextFilters);
    },
    [dispatch, syncStoreFilters, syncUrl]
  );

  const applyFilters = useCallback(
    ({
      search = searchTerm,
      priority = selectedPriority,
      status = selectedStatus,
      type = selectedType,
      isUrgent = showUrgentOnly,
      importedOnly = showImportedOnly,
      sortBy = selectedSort,
      sortOrder = selectedOrder,
      quickFilter: nextQuickFilter = quickFilter,
      dueSoonDays: nextDueSoonDays = dueSoonDays,
      page: nextPage = 1,
      limit: nextLimit = filters.limit || DEFAULT_CASE_LIST_FILTERS.limit,
    }: CaseListFilterOverrides = {}) => {
      setSearchTerm(search);
      setSelectedPriority(priority);
      setSelectedStatus(status);
      setSelectedType(type);
      setShowUrgentOnly(isUrgent);
      setShowImportedOnly(importedOnly);
      setSelectedSort(sortBy);
      setSelectedOrder(sortOrder);
      setQuickFilter(nextQuickFilter);
      setDueSoonDays(nextDueSoonDays);

      const normalizedSearch = search.trim();
      commitFilters(
        normalizeCaseFilters({
          search: normalizedSearch ? normalizedSearch : undefined,
          contact_id: filters.contact_id || undefined,
          account_id: filters.account_id || undefined,
          priority: priority || undefined,
          status_id: status || undefined,
          case_type_id: type || undefined,
          assigned_to: filters.assigned_to || undefined,
          is_urgent: isUrgent || undefined,
          imported_only: importedOnly || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          quick_filter: nextQuickFilter === 'all' ? undefined : nextQuickFilter,
          due_within_days: nextQuickFilter === 'due_soon' ? nextDueSoonDays : undefined,
          page: nextPage,
          limit: nextLimit,
        })
      );
    },
    [
      commitFilters,
      dueSoonDays,
      filters.account_id,
      filters.assigned_to,
      filters.contact_id,
      filters.limit,
      quickFilter,
      searchTerm,
      selectedOrder,
      selectedPriority,
      selectedSort,
      selectedStatus,
      selectedType,
      showImportedOnly,
      showUrgentOnly,
    ]
  );

  const handleSearch = useCallback(() => {
    applyFilters({ page: 1 });
  }, [applyFilters]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedPriority('');
    setSelectedStatus('');
    setSelectedType('');
    setShowUrgentOnly(false);
    setShowImportedOnly(false);
    setSelectedSort(DEFAULT_CASE_LIST_FILTERS.sort_by || 'created_at');
    setSelectedOrder(DEFAULT_CASE_LIST_FILTERS.sort_order || 'desc');
    setQuickFilter('all');
    setDueSoonDays(7);
    setActiveFilters(getDefaultCaseListFilters());
    dispatch(clearCaseSelection());
    dispatch(clearFilters());
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [dispatch, setSearchParams]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      commitFilters({
        ...filters,
        page: newPage,
      });
    },
    [commitFilters, filters]
  );

  const handleLimitChange = useCallback(
    (nextLimit: number) => {
      commitFilters({
        ...filters,
        limit: nextLimit,
        page: 1,
      });
    },
    [commitFilters, filters]
  );

  const activeFiltersCount = [
    filters.search,
    filters.contact_id,
    filters.account_id,
    filters.priority,
    filters.status_id,
    filters.case_type_id,
    filters.assigned_to,
    filters.is_urgent,
    filters.imported_only,
    filters.quick_filter,
  ].filter(Boolean).length;
  const hasActiveFilters = activeFiltersCount > 0;

  return {
    filters,
    searchTerm,
    setSearchTerm,
    selectedPriority,
    setSelectedPriority,
    selectedStatus,
    setSelectedStatus,
    selectedType,
    setSelectedType,
    showUrgentOnly,
    setShowUrgentOnly,
    showImportedOnly,
    setShowImportedOnly,
    selectedSort,
    setSelectedSort,
    selectedOrder,
    setSelectedOrder,
    quickFilter,
    setQuickFilter,
    dueSoonDays,
    setDueSoonDays,
    activeFiltersCount,
    hasActiveFilters,
    applyFilters,
    handleSearch,
    handleClearFilters,
    handlePageChange,
    handleLimitChange,
  };
}
