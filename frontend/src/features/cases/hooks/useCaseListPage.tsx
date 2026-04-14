import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchCases,
  fetchCaseSummary,
  fetchCaseTypes,
  fetchCaseStatuses,
  setFilters,
  clearFilters,
  toggleCaseSelection,
  selectAllCases,
  clearCaseSelection,
  bulkUpdateCaseStatus,
} from '../state';
import type { CaseFilter, CasePriority, CaseType, CaseStatus } from '../../../types/case';
import { useToast } from '../../../contexts/useToast';
import { type CaseDisplayMeta } from '../components/CaseListResults';

type QuickFilter = 'all' | 'active' | 'overdue' | 'due_soon' | 'unassigned' | 'urgent';
type SavedView = {
  id: string;
  name: string;
  filters: CaseFilter;
  quickFilter: QuickFilter;
};

interface CaseListFilterOverrides {
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
}

const SAVED_VIEWS_KEY = 'cases.savedViews';

export const useCaseListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const { cases, total, loading, error, filters, selectedCaseIds, summary } = useAppSelector(
    (state) => state.cases.list
  );
  const { caseTypes, caseStatuses } = useAppSelector((state) => state.cases.core);
  const hasInitializedFromUrl = useRef(false);

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedPriority, setSelectedPriority] = useState<CasePriority | ''>(filters.priority || '');
  const [selectedStatus, setSelectedStatus] = useState(filters.status_id || '');
  const [selectedType, setSelectedType] = useState(filters.case_type_id || '');
  const [showUrgentOnly, setShowUrgentOnly] = useState(filters.is_urgent || false);
  const [showImportedOnly, setShowImportedOnly] = useState(filters.imported_only || false);
  const [selectedSort, setSelectedSort] = useState(filters.sort_by || 'created_at');
  const [selectedOrder, setSelectedOrder] = useState(filters.sort_order || 'desc');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [dueSoonDays, setDueSoonDays] = useState(7);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState('');
  const [savedViewName, setSavedViewName] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatusId, setBulkStatusId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');

  useEffect(() => {
    dispatch(fetchCaseTypes());
    dispatch(fetchCaseStatuses());
    dispatch(fetchCaseSummary());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCases(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (hasInitializedFromUrl.current) return;
    const parseBoolean = (value: string | null) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;
    };
    const parseNumber = (value: string | null) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };
    const statusParam = searchParams.get('status');
    const statusIdParam = searchParams.get('status_id');
    const legacyQuickFilterMap: Partial<Record<string, QuickFilter>> = {
      active: 'active',
      urgent: 'urgent',
      unassigned: 'unassigned',
      overdue: 'overdue',
    };
    const initialQuickFilter = (searchParams.get('quick_filter') || legacyQuickFilterMap[statusParam || '']) as QuickFilter | null;
    const quickFilterValue =
      initialQuickFilter && ['active', 'overdue', 'due_soon', 'unassigned', 'urgent'].includes(initialQuickFilter)
        ? initialQuickFilter
        : 'all';
    const dueWithin = parseNumber(searchParams.get('due_within_days'));
    const importedOnlyParam = parseBoolean(searchParams.get('imported_only'));
    const initialFilters: CaseFilter = {
      search: searchParams.get('search') || undefined,
      contact_id: searchParams.get('contact_id') || undefined,
      account_id: searchParams.get('account_id') || undefined,
      priority: (searchParams.get('priority') as CaseFilter['priority']) || undefined,
      status_id:
        statusIdParam || (statusParam && !legacyQuickFilterMap[statusParam] ? statusParam : undefined),
      case_type_id: searchParams.get('type') || searchParams.get('case_type_id') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      is_urgent: parseBoolean(searchParams.get('is_urgent')),
      sort_by: searchParams.get('sort_by') || undefined,
      sort_order: (searchParams.get('sort_order') as CaseFilter['sort_order']) || undefined,
      page: parseNumber(searchParams.get('page')),
      limit: parseNumber(searchParams.get('limit')),
      quick_filter: quickFilterValue === 'all' ? undefined : quickFilterValue,
      due_within_days: dueWithin,
      imported_only: importedOnlyParam,
    };

    const hasParams = Array.from(searchParams.keys()).length > 0;
    if (hasParams) {
      setSearchTerm(initialFilters.search || '');
      setSelectedPriority(initialFilters.priority || '');
      setSelectedStatus(initialFilters.status_id || '');
      setSelectedType(initialFilters.case_type_id || '');
      setShowUrgentOnly(initialFilters.is_urgent || false);
      setShowImportedOnly(initialFilters.imported_only || false);
      setSelectedSort(initialFilters.sort_by || 'created_at');
      setSelectedOrder(initialFilters.sort_order || 'desc');
      setQuickFilter(quickFilterValue);
      setDueSoonDays(typeof dueWithin === 'number' && dueWithin > 0 ? dueWithin : 7);
      dispatch(setFilters({ ...filters, ...initialFilters }));
    }
    hasInitializedFromUrl.current = true;
  }, [dispatch, filters, searchParams]);

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

  const persistSavedViews = (views: SavedView[]) => {
    setSavedViews(views);
    try {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
    } catch {
      // no-op if storage is unavailable
    }
  };

  const syncUrl = (overrides: Partial<CaseFilter> = {}) => {
    const baseFilters: CaseFilter = {
      search: searchTerm.trim() || undefined,
      contact_id: filters.contact_id || undefined,
      account_id: filters.account_id || undefined,
      priority: selectedPriority || undefined,
      status_id: selectedStatus || undefined,
      case_type_id: selectedType || undefined,
      assigned_to: filters.assigned_to || undefined,
      is_urgent: showUrgentOnly || undefined,
      sort_by: selectedSort || undefined,
      sort_order: selectedOrder || undefined,
      page: filters.page,
      limit: filters.limit,
      quick_filter: quickFilter === 'all' ? undefined : quickFilter,
      due_within_days: quickFilter === 'due_soon' ? dueSoonDays : undefined,
      imported_only: showImportedOnly || undefined,
    };
    const merged = { ...baseFilters, ...overrides };
    const params = new URLSearchParams();
    Object.entries(merged).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (key === 'status_id') {
          params.set('status', String(value));
          return;
        }
        if (key === 'case_type_id') {
          params.set('type', String(value));
          return;
        }
        params.set(key, String(value));
      }
    });
    setSearchParams(params, { replace: true });
  };

  const applyFilters = ({
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
    const nextFilters: Partial<CaseFilter> = {
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
    };
    dispatch(clearCaseSelection());
    dispatch(setFilters(nextFilters));
    syncUrl(nextFilters);
  };

  const handleSearch = () => {
    applyFilters({ page: 1 });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedPriority('');
    setSelectedStatus('');
    setSelectedType('');
    setShowUrgentOnly(false);
    setShowImportedOnly(false);
    setSelectedSort('created_at');
    setSelectedOrder('desc');
    setQuickFilter('all');
    setDueSoonDays(7);
    dispatch(clearCaseSelection());
    dispatch(clearFilters());
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    dispatch(clearCaseSelection());
    dispatch(setFilters({ page: newPage }));
    syncUrl({ page: newPage });
  };

  const handleLimitChange = (nextLimit: number) => {
    dispatch(clearCaseSelection());
    dispatch(setFilters({ limit: nextLimit, page: 1 }));
    syncUrl({ limit: nextLimit, page: 1 });
  };

  const applySavedView = (viewId: string) => {
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
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
    });
  };

  const handleSaveView = () => {
    const trimmedName = savedViewName.trim();
    if (!trimmedName) return;
    const newView: SavedView = {
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
  };

  const handleDeleteView = () => {
    if (!selectedViewId) return;
    const updated = savedViews.filter((item) => item.id !== selectedViewId);
    persistSavedViews(updated);
    setSelectedViewId('');
  };

  const totalPages = Math.ceil(total / (filters.limit || 20));
  const currentPage = filters.page || 1;
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
      const statusLabel = caseStatuses.find((item: CaseStatus) => item.id === selectedStatus)?.name || 'Status';
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
        label: quickFilter === 'due_soon' ? `Quick: due soon (${dueSoonDays}d)` : `Quick: ${quickFilter.replace('_', ' ')}`,
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
  const handleRemoveFilterChip = (key: string) => {
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
  };

  const caseDisplayMetaById = useMemo(() => {
    const caseMeta = new Map<string, CaseDisplayMeta>();
    const nowMs = Date.now();
    const dueSoonCutoffMs = nowMs + dueSoonDays * 24 * 60 * 60 * 1000;

    for (const caseItem of cases) {
      const contactLabel = `${caseItem.contact_first_name || ''} ${caseItem.contact_last_name || ''}`.trim() || 'Unknown contact';
      const assignedLabel =
        (caseItem.assigned_first_name || caseItem.assigned_last_name)
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
          : `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'month' : 'months'}`;

      let dueDateLabel = '—';
      let isOverdue = false;
      let isDueSoon = false;

      if (caseItem.due_date) {
        const dueMs = new Date(caseItem.due_date).getTime();
        const isClosedState = caseItem.status_type === 'closed' || caseItem.status_type === 'cancelled';
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

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusId || selectedCaseIds.length === 0) return;
    try {
      await dispatch(
        bulkUpdateCaseStatus({
          case_ids: selectedCaseIds,
          new_status_id: bulkStatusId,
          notes: bulkNotes || undefined,
        })
      ).unwrap();
      showSuccess(`Updated ${selectedCaseIds.length} cases`);
      setShowBulkModal(false);
      setBulkStatusId('');
      setBulkNotes('');
      dispatch(fetchCases(filters));
      dispatch(fetchCaseSummary());
    } catch {
      showError('Failed to update cases');
    }
  };

  const paginationPages = (() => {
    if (totalPages <= 1) return [];
    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    const start = Math.max(1, Math.min(currentPage - halfWindow, totalPages - windowSize + 1));
    const end = Math.min(totalPages, start + windowSize - 1);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) pages.push(page);
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
    persistSavedViews,
    syncUrl,
    showSuccess,
    showError,
    dispatch,
  };
};

export type UseCaseListPageResult = ReturnType<typeof useCaseListPage>;
