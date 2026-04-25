import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearCaseSelection,
  fetchCases,
  fetchCaseStatuses,
  fetchCaseSummary,
  fetchCaseTypes,
  selectAllCases,
  toggleCaseSelection,
} from '../state';
import type { CaseStatus, CaseType } from '../../../types/case';
import { useToast } from '../../../contexts/useToast';
import type { CaseDisplayMeta } from '../components/CaseListResults';
import { useCaseBulkStatus } from './useCaseBulkStatus';
import { useCaseListQueryState } from './useCaseListQueryState';
import { useSavedCaseViews } from './useSavedCaseViews';

export const useCaseListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const {
    cases,
    total,
    loading,
    error,
    filters: storedFilters,
    selectedCaseIds,
    summary,
  } = useAppSelector((state) => state.cases.list);
  const { caseTypes, caseStatuses } = useAppSelector((state) => state.cases.core);

  const {
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
  } = useCaseListQueryState({
    dispatch,
    initialFiltersFromStore: storedFilters,
    searchParams,
    setSearchParams,
  });

  useEffect(() => {
    dispatch(fetchCaseTypes());
    dispatch(fetchCaseStatuses());
    dispatch(fetchCaseSummary());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCases(filters));
  }, [dispatch, filters]);

  const {
    savedViews,
    selectedViewId,
    setSelectedViewId,
    savedViewName,
    setSavedViewName,
    applySavedView,
    handleSaveView,
    handleDeleteView,
    savedViewsLoading,
    savedViewsError,
    savedViewsUsingLocalFallback,
  } = useSavedCaseViews({
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
  });

  const {
    showBulkModal,
    setShowBulkModal,
    bulkStatusId,
    setBulkStatusId,
    bulkNotes,
    setBulkNotes,
    handleBulkStatusUpdate,
  } = useCaseBulkStatus({
    dispatch,
    filters,
    selectedCaseIds,
    showSuccess,
    showError,
  });

  const totalPages = Math.ceil(total / (filters.limit || 20));
  const currentPage = filters.page || 1;
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      chips.push({ key: 'search', label: `Search: ${trimmedSearch}` });
    }
    if (selectedType) {
      const typeLabel = caseTypes.find((item: CaseType) => item.id === selectedType)?.name || 'Type';
      chips.push({ key: 'type', label: `Type: ${typeLabel}` });
    }
    if (selectedStatus) {
      const statusLabel =
        caseStatuses.find((item: CaseStatus) => item.id === selectedStatus)?.name || 'Status';
      chips.push({ key: 'status', label: `Status: ${statusLabel}` });
    }
    if (selectedPriority) {
      chips.push({ key: 'priority', label: `Priority: ${selectedPriority}` });
    }
    if (showUrgentOnly) {
      chips.push({ key: 'urgent', label: 'Urgent only' });
    }
    if (showImportedOnly) {
      chips.push({ key: 'imported_only', label: 'Imported only' });
    }
    if (quickFilter !== 'all') {
      chips.push({
        key: 'quick_filter',
        label:
          quickFilter === 'due_soon'
            ? `Quick: due soon (${dueSoonDays}d)`
            : `Quick: ${quickFilter.replace('_', ' ')}`,
      });
    }
    return chips;
  }, [
    caseStatuses,
    caseTypes,
    dueSoonDays,
    quickFilter,
    searchTerm,
    selectedPriority,
    selectedStatus,
    selectedType,
    showUrgentOnly,
    showImportedOnly,
  ]);

  const handleRemoveFilterChip = useCallback(
    (key: string) => {
      switch (key) {
        case 'search':
          applyFilters({ search: '', page: 1 });
          break;
        case 'type':
          applyFilters({ type: '', page: 1 });
          break;
        case 'status':
          applyFilters({ status: '', page: 1 });
          break;
        case 'priority':
          applyFilters({ priority: '', page: 1 });
          break;
        case 'urgent':
          applyFilters({ isUrgent: false, page: 1 });
          break;
        case 'imported_only':
          applyFilters({ importedOnly: false, page: 1 });
          break;
        case 'quick_filter':
          applyFilters({ quickFilter: 'all', dueSoonDays: 7, page: 1 });
          break;
        default:
          break;
      }
    },
    [applyFilters]
  );

  const caseDisplayMetaById = useMemo(() => {
    const caseMeta = new Map<string, CaseDisplayMeta>();
    const nowMs = Date.now();
    const dueSoonCutoffMs = nowMs + dueSoonDays * 24 * 60 * 60 * 1000;

    for (const caseItem of cases) {
      const contactLabel =
        `${caseItem.contact_first_name || ''} ${caseItem.contact_last_name || ''}`.trim() ||
        'Unknown contact';
      const assignedLabel =
        caseItem.assigned_first_name || caseItem.assigned_last_name
          ? `${caseItem.assigned_first_name || ''} ${caseItem.assigned_last_name || ''}`.trim()
          : caseItem.assigned_to
            ? 'Assigned'
            : 'Unassigned';

      const createdMs = new Date(caseItem.created_at).getTime();
      const days = Math.max(0, Math.floor((nowMs - createdMs) / (1000 * 60 * 60 * 24)));
      const ageLabel =
        days === 0
          ? 'Today'
          : days === 1
            ? '1 day'
            : days < 30
              ? `${days} days`
              : `${Math.floor(days / 30)} ${
                  Math.floor(days / 30) === 1 ? 'month' : 'months'
                }`;

      let dueDateLabel = '—';
      let isOverdue = false;
      let isDueSoon = false;

      if (caseItem.due_date) {
        const dueMs = new Date(caseItem.due_date).getTime();
        const isClosedState =
          caseItem.status_type === 'closed' || caseItem.status_type === 'cancelled';
        dueDateLabel = new Date(caseItem.due_date).toLocaleDateString();
        if (!isClosedState) {
          isOverdue = dueMs < nowMs;
          isDueSoon = !isOverdue && dueMs >= nowMs && dueMs <= dueSoonCutoffMs;
        }
      }

      caseMeta.set(caseItem.id, {
        isOverdue,
        isDueSoon,
        ageLabel,
        dueDateLabel,
        assignedLabel,
        contactLabel,
      });
    }

    return caseMeta;
  }, [cases, dueSoonDays]);

  const handleToggleSelection = useCallback(
    (caseId: string) => {
      dispatch(toggleCaseSelection(caseId));
    },
    [dispatch]
  );

  const handleNavigateCase = useCallback(
    (caseId: string) => {
      navigate(`/cases/${caseId}`);
    },
    [navigate]
  );

  const handleEditCase = useCallback(
    (caseId: string) => {
      navigate(`/cases/${caseId}/edit`);
    },
    [navigate]
  );

  const handleNavigateNewCase = useCallback(() => {
    navigate('/cases/new');
  }, [navigate]);

  const handleClearSelection = useCallback(() => {
    dispatch(clearCaseSelection());
  }, [dispatch]);

  const handleSelectAllCases = useCallback(() => {
    dispatch(selectAllCases());
  }, [dispatch]);

  const paginationPages = (() => {
    if (totalPages <= 1) return [];
    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    const start = Math.max(
      1,
      Math.min(currentPage - halfWindow, totalPages - windowSize + 1)
    );
    const end = Math.min(totalPages, start + windowSize - 1);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  })();

  const visibleCases = cases;

  return {
    cases,
    visibleCases,
    total,
    loading,
    error,
    filters,
    selectedCaseIds,
    summary,
    caseTypes,
    caseStatuses,
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
    savedViews,
    savedViewsLoading,
    savedViewsError,
    savedViewsUsingLocalFallback,
    selectedViewId,
    setSelectedViewId,
    savedViewName,
    setSavedViewName,
    showBulkModal,
    setShowBulkModal,
    bulkStatusId,
    setBulkStatusId,
    bulkNotes,
    setBulkNotes,
    activeFilterChips,
    handleRemoveFilterChip,
    caseDisplayMetaById,
    handleToggleSelection,
    handleNavigateCase,
    handleEditCase,
    handleNavigateNewCase,
    handleClearSelection,
    handleSelectAllCases,
    handleBulkStatusUpdate,
    paginationPages,
    currentPage,
    totalPages,
    activeFiltersCount,
    hasActiveFilters,
    applyFilters,
    handleSearch,
    handleClearFilters,
    handlePageChange,
    handleLimitChange,
    applySavedView,
    handleSaveView,
    handleDeleteView,
    showSuccess,
    showError,
    dispatch,
  };
};

export type UseCaseListPageResult = ReturnType<typeof useCaseListPage>;
