import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BrutalBadge, BrutalButton, BrutalCard, BrutalInput, NeoBrutalistLayout } from '../../../components/neo-brutalist';
import CaseListFiltersBar from '../../../features/cases/components/CaseListFiltersBar';
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
} from '../../../features/cases/state';
import type { CaseFilter, CasePriority, CaseStatusType, CaseWithDetails } from '../../../types/case';
import { useToast } from '../../../contexts/useToast';
import {
  CASE_PRIORITY_OPTIONS,
  getCasePriorityBadgeColor,
} from '../../../features/cases/utils/casePriority';

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
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  quickFilter?: QuickFilter;
  dueSoonDays?: number;
  page?: number;
}

const SAVED_VIEWS_KEY = 'cases.savedViews';

const CaseList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const { cases, total, loading, error, filters, caseTypes, caseStatuses } = useAppSelector(
    (state) => state.casesV2
  );
  const summary = useAppSelector((state) => state.casesV2.summary);
  const selectedCaseIds = useAppSelector((state) => state.casesV2.selectedCaseIds);
  const hasInitializedFromUrl = useRef(false);

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedPriority, setSelectedPriority] = useState<CasePriority | ''>(filters.priority || '');
  const [selectedStatus, setSelectedStatus] = useState(filters.status_id || '');
  const [selectedType, setSelectedType] = useState(filters.case_type_id || '');
  const [showUrgentOnly, setShowUrgentOnly] = useState(filters.is_urgent || false);
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
    };

    const hasParams = Array.from(searchParams.keys()).length > 0;
    if (hasParams) {
      setSearchTerm(initialFilters.search || '');
      setSelectedPriority(initialFilters.priority || '');
      setSelectedStatus(initialFilters.status_id || '');
      setSelectedType(initialFilters.case_type_id || '');
      setShowUrgentOnly(initialFilters.is_urgent || false);
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

  const getStatusTypeBadgeColor = (statusType: CaseStatusType) => {
    const colors: Record<CaseStatusType, 'purple' | 'green' | 'yellow' | 'gray' | 'red'> = {
      intake: 'purple',
      active: 'green',
      review: 'yellow',
      closed: 'gray',
      cancelled: 'red',
    };
    return colors[statusType];
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
      const typeLabel = caseTypes.find((item) => item.id === selectedType)?.name || 'Type';
      chips.push({ key: 'type', label: `Type: ${typeLabel}` });
    }
    if (selectedStatus) {
      const statusLabel = caseStatuses.find((item) => item.id === selectedStatus)?.name || 'Status';
      chips.push({ key: 'status', label: `Status: ${statusLabel}` });
    }
    if (selectedPriority) {
      chips.push({ key: 'priority', label: `Priority: ${selectedPriority}` });
    }
    if (showUrgentOnly) {
      chips.push({ key: 'urgent', label: 'Urgent only' });
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
      case 'quick_filter':
        applyFilters({ quickFilter: 'all', dueSoonDays: 7, page: 1 });
        break;
      default:
        break;
    }
  };
  const assignedLabel = (caseItem: (typeof cases)[number]) => {
    if (caseItem.assigned_first_name || caseItem.assigned_last_name) {
      return `${caseItem.assigned_first_name || ''} ${caseItem.assigned_last_name || ''}`.trim();
    }
    return caseItem.assigned_to ? 'Assigned' : 'Unassigned';
  };
  const contactLabel = (caseItem: (typeof cases)[number]) => {
    const name = `${caseItem.contact_first_name || ''} ${caseItem.contact_last_name || ''}`.trim();
    return name || 'Unknown contact';
  };

  // Overdue and due-soon helpers
  const isOverdue = (caseItem: CaseWithDetails): boolean => {
    if (!caseItem.due_date) return false;
    if (caseItem.status_type === 'closed' || caseItem.status_type === 'cancelled') return false;
    return new Date(caseItem.due_date) < new Date();
  };

  const isDueSoon = (caseItem: CaseWithDetails, days = 7): boolean => {
    if (!caseItem.due_date) return false;
    if (caseItem.status_type === 'closed' || caseItem.status_type === 'cancelled') return false;
    const due = new Date(caseItem.due_date);
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return due >= now && due <= future;
  };

  const getCaseAge = (caseItem: CaseWithDetails): string => {
    const created = new Date(caseItem.created_at);
    const now = new Date();
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  };

  const formatDueDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

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

  return (
    <NeoBrutalistLayout pageTitle="Cases">
      <div className="p-6 space-y-6">
      {/* Header */}
      <BrutalCard color="yellow" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">Cases</h1>
            <p className="mt-1 font-bold text-black">
              {total} {total === 1 ? 'case' : 'cases'} found
            </p>
          </div>
          <BrutalButton onClick={() => navigate('/cases/new')} variant="primary">
            + New Case
          </BrutalButton>
        </div>
        {summary && (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
              <div className="text-xs font-black uppercase text-black/70">Open</div>
              <div className="text-2xl font-black text-black">{summary.open_cases}</div>
            </div>
            <div className="border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
              <div className="text-xs font-black uppercase text-black/70">Urgent</div>
              <div className="text-2xl font-black text-app-accent">{summary.by_priority.urgent}</div>
            </div>
            <div className={`border-2 border-black px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)] ${summary.overdue_cases > 0 ? 'bg-app-accent-soft' : 'bg-white'}`}>
              <div className="text-xs font-black uppercase text-black/70">Overdue</div>
              <div className={`text-2xl font-black ${summary.overdue_cases > 0 ? 'text-app-accent' : 'text-black'}`}>{summary.overdue_cases}</div>
            </div>
            <div className="border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
              <div className="text-xs font-black uppercase text-black/70">Due This Week</div>
              <div className="text-2xl font-black text-black">{summary.cases_due_this_week}</div>
            </div>
            <div className="border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
              <div className="text-xs font-black uppercase text-black/70">Unassigned</div>
              <div className="text-2xl font-black text-black">{summary.unassigned_cases}</div>
            </div>
          </div>
        )}
      </BrutalCard>

      {/* Filters */}
      <BrutalCard color="white" className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <BrutalInput
              type="text"
              placeholder="Search by case number, title, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
          </div>

          {/* Case Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="">All Types</option>
              {caseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="">All Statuses</option>
              {caseStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as CasePriority | '')}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="">All Priorities</option>
              {CASE_PRIORITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase text-black/70">Sort by</span>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="created_at">Created date</option>
              <option value="due_date">Due date</option>
              <option value="priority">Priority</option>
              <option value="case_number">Case number</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase text-black/70">Order</span>
            <select
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value as 'asc' | 'desc')}
              className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black uppercase text-black/70">Saved views</span>
            <div className="flex gap-2">
              <select
                value={selectedViewId}
                onChange={(e) => applySavedView(e.target.value)}
                className="flex-1 border-2 border-black dark:border-white bg-white dark:bg-[#000000] text-black dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              >
                <option value="">Select view</option>
                {savedViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleDeleteView}
                className="border-2 border-black bg-white text-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                disabled={!selectedViewId}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase text-black/70">Quick filters</span>
          {([
            ['all', 'All'],
            ['active', 'Active'],
            ['overdue', 'Overdue'],
            ['due_soon', 'Due soon'],
            ['unassigned', 'Unassigned'],
            ['urgent', 'Urgent'],
          ] as Array<[QuickFilter, string]>).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                applyFilters({
                  quickFilter: value,
                  dueSoonDays,
                  page: 1,
                });
              }}
              className={`border-2 border-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-all ${
                quickFilter === value
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-[var(--loop-yellow)]'
              }`}
            >
              {label}
            </button>
          ))}
          {quickFilter === 'due_soon' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-black/70">Days</span>
              <input
                type="number"
                min={1}
                max={60}
                value={dueSoonDays}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  const nextValue = Number.isNaN(value) ? 7 : Math.max(1, Math.min(60, value));
                  applyFilters({
                    quickFilter: 'due_soon',
                    dueSoonDays: nextValue,
                    page: 1,
                  });
                }}
                className="w-20 border-2 border-black bg-white text-black px-2 py-1 text-xs font-black uppercase focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          )}
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showUrgentOnly}
              onChange={(e) => setShowUrgentOnly(e.target.checked)}
              className="w-5 h-5 border-2 border-black dark:border-white accent-black dark:accent-white"
            />
            <span className="text-sm font-bold text-black dark:text-white uppercase">
              Urgent only
            </span>
          </label>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <BrutalInput
              type="text"
              placeholder="Save current view"
              value={savedViewName}
              onChange={(e) => setSavedViewName(e.target.value)}
            />
            <BrutalButton onClick={handleSaveView} variant="secondary" size="sm">
              Save View
            </BrutalButton>
          </div>
          <BrutalButton
            onClick={async () => {
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(window.location.href);
                  showSuccess('Link copied to clipboard');
                  return;
                }
                const fallbackInput = document.createElement('textarea');
                fallbackInput.value = window.location.href;
                fallbackInput.style.position = 'fixed';
                fallbackInput.style.opacity = '0';
                document.body.appendChild(fallbackInput);
                fallbackInput.focus();
                fallbackInput.select();
                const success = document.execCommand('copy');
                document.body.removeChild(fallbackInput);
                if (success) {
                  showSuccess('Link copied to clipboard');
                } else {
                  showError('Failed to copy link');
                }
              } catch {
                showError('Failed to copy link');
              }
            }}
            variant="secondary"
            size="sm"
          >
            Copy Link
          </BrutalButton>
          {hasActiveFilters && (
            <span className="text-xs font-black uppercase text-black/70">
              {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} applied
            </span>
          )}
          <BrutalButton onClick={handleClearFilters} variant="secondary" size="sm">
            Clear Filters
          </BrutalButton>
          <BrutalButton onClick={handleSearch} variant="primary" size="sm">
            Apply Filters
          </BrutalButton>
        </div>

        <CaseListFiltersBar
          chips={activeFilterChips}
          onRemove={handleRemoveFilterChip}
          onClearAll={handleClearFilters}
        />
      </BrutalCard>

      {/* Error Message */}
      {error && (
        <div className="border-2 border-black shadow-[6px_6px_0px_var(--shadow-color)] bg-app-accent-soft text-black p-4 font-bold">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-black dark:border-white border-t-transparent"></div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedCaseIds.length > 0 && (
        <BrutalCard color="purple" className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black uppercase text-black">
                {selectedCaseIds.length} case{selectedCaseIds.length === 1 ? '' : 's'} selected
              </span>
              <BrutalButton onClick={() => dispatch(clearCaseSelection())} variant="secondary" size="sm">
                Clear
              </BrutalButton>
            </div>
            <div className="flex items-center gap-2">
              <BrutalButton onClick={() => setShowBulkModal(true)} variant="primary" size="sm">
                Bulk Status Change
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>
      )}

      {/* Bulk Status Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
          <BrutalCard color="white" className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-black uppercase mb-4 text-black">
              Bulk Status Update ({selectedCaseIds.length} cases)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase text-black/70 mb-2">New Status</label>
                <select
                  value={bulkStatusId}
                  onChange={(e) => setBulkStatusId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select status...</option>
                  {caseStatuses.map((status) => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-black uppercase text-black/70 mb-2">Notes</label>
                <textarea
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  rows={3}
                  placeholder="Reason for bulk status change..."
                  className="w-full px-3 py-2 border-2 border-black bg-white text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex justify-end gap-3">
                <BrutalButton onClick={() => { setShowBulkModal(false); setBulkStatusId(''); setBulkNotes(''); }} variant="secondary">
                  Cancel
                </BrutalButton>
                <BrutalButton onClick={handleBulkStatusUpdate} disabled={!bulkStatusId || loading} variant="primary">
                  {loading ? 'Updating...' : 'Update All'}
                </BrutalButton>
              </div>
            </div>
          </BrutalCard>
        </div>
      )}

      {/* Cases Table */}
      {!loading && visibleCases.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {visibleCases.map((caseItem) => (
              <BrutalCard
                key={caseItem.id}
                color="white"
                className={`p-4 cursor-pointer transition-colors ${isOverdue(caseItem) ? 'border-app-border bg-app-accent-soft' : 'hover:bg-[var(--loop-yellow)]'}`}
                onClick={() => navigate(`/cases/${caseItem.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCaseIds.includes(caseItem.id)}
                      onChange={(e) => { e.stopPropagation(); dispatch(toggleCaseSelection(caseItem.id)); }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-5 h-5 border-2 border-black accent-black"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        {caseItem.is_urgent && (
                          <span className="text-black" title="Urgent">⚠️</span>
                        )}
                        <span className="text-xs font-black uppercase text-black/70">{caseItem.case_number}</span>
                      </div>
                      <div className="text-lg font-black text-black">{caseItem.title}</div>
                      <div className="text-sm font-bold text-black">{contactLabel(caseItem)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <BrutalBadge color={caseItem.status_type ? getStatusTypeBadgeColor(caseItem.status_type) : 'gray'} size="sm">
                      {caseItem.status_name}
                    </BrutalBadge>
                    <BrutalBadge color={getCasePriorityBadgeColor(caseItem.priority)} size="sm">
                      {caseItem.priority}
                    </BrutalBadge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-black/70">
                  <span
                    className="inline-block border-2 border-black bg-app-surface-muted px-2 py-1 text-xs font-black uppercase text-black"
                  >
                    {caseItem.case_type_name || 'General'}
                  </span>
                  <span>Assigned: {assignedLabel(caseItem)}</span>
                  <span>Age: {getCaseAge(caseItem)}</span>
                  {caseItem.due_date && (
                    <span className={isOverdue(caseItem) ? 'text-app-accent font-black' : isDueSoon(caseItem) ? 'text-app-accent font-black' : ''}>
                      Due: {formatDueDate(caseItem.due_date)}
                      {isOverdue(caseItem) && ' (OVERDUE)'}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseItem.id}/edit`); }}
                    className="flex-1 border-2 border-black bg-white text-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseItem.id}`); }}
                    className="flex-1 border-2 border-black bg-[var(--loop-green)] text-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                  >
                    View
                  </button>
                </div>
              </BrutalCard>
            ))}
          </div>

          <BrutalCard color="white" className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-[var(--loop-cyan)] border-b-2 border-black">
                  <tr>
                    <th className="px-4 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.length === visibleCases.length && visibleCases.length > 0}
                        onChange={() => selectedCaseIds.length === visibleCases.length ? dispatch(clearCaseSelection()) : dispatch(selectAllCases())}
                        className="w-5 h-5 border-2 border-black accent-black"
                      />
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Case #
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Title
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Client
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Type
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Priority
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Assigned
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Due Date
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Age
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-black">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {visibleCases.map((caseItem) => {
                    const caseOverdue = isOverdue(caseItem);
                    const caseDueSoon = isDueSoon(caseItem);
                    return (
                    <tr
                      key={caseItem.id}
                      className={`border-b-2 border-black cursor-pointer transition-colors ${
                        caseOverdue
                          ? 'bg-app-accent-soft hover:bg-app-accent-soft'
                          : caseDueSoon
                          ? 'bg-app-accent-soft hover:bg-app-accent-soft'
                          : 'hover:bg-[var(--loop-yellow)]'
                      } ${selectedCaseIds.includes(caseItem.id) ? 'ring-2 ring-inset ring-black' : ''}`}
                      onClick={() => navigate(`/cases/${caseItem.id}`)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCaseIds.includes(caseItem.id)}
                          onChange={() => dispatch(toggleCaseSelection(caseItem.id))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 border-2 border-black accent-black"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {caseItem.is_urgent && (
                            <span className="text-black" title="Urgent">⚠️</span>
                          )}
                          <span className="text-sm font-black text-black">{caseItem.case_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-black text-black">{caseItem.title}</div>
                        {caseItem.description && (
                          <div className="text-sm text-black/70 truncate max-w-xs">{caseItem.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-black">{contactLabel(caseItem)}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className="inline-block border-2 border-black bg-app-surface-muted px-3 py-1 text-xs font-black uppercase text-black"
                        >
                          {caseItem.case_type_name || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <BrutalBadge color={caseItem.status_type ? getStatusTypeBadgeColor(caseItem.status_type) : 'gray'} size="sm">
                          {caseItem.status_name}
                        </BrutalBadge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                          <BrutalBadge color={getCasePriorityBadgeColor(caseItem.priority)} size="sm">
                            {caseItem.priority}
                          </BrutalBadge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-black">
                        {assignedLabel(caseItem)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold">
                        {caseItem.due_date ? (
                          <span className={caseOverdue ? 'text-app-accent font-black' : caseDueSoon ? 'text-app-accent font-black' : 'text-black'}>
                            {formatDueDate(caseItem.due_date)}
                            {caseOverdue && (
                              <span className="block text-xs text-app-accent font-black uppercase">Overdue</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-black/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs font-bold text-black/60">
                        {getCaseAge(caseItem)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseItem.id}/edit`); }}
                            className="border-2 border-black bg-white text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseItem.id}`); }}
                            className="border-2 border-black bg-[var(--loop-green)] text-black px-3 py-1 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </BrutalCard>
        </>
      )}

      {/* Empty State */}
      {!loading && visibleCases.length === 0 && (
        <BrutalCard color="white" className="p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-black uppercase mb-2 text-black">No cases found</h3>
          <p className="text-black/70 font-bold mb-6">
            {filters.search || filters.priority || filters.status_id
              ? 'Try adjusting your filters'
              : 'Get started by creating your first case'}
          </p>
          <div className="flex justify-center">
            <BrutalButton onClick={() => navigate('/cases/new')} variant="primary">
              Create First Case
            </BrutalButton>
          </div>
        </BrutalCard>
      )}

      {/* Pagination */}
      {!loading && cases.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="flex items-center gap-4 text-sm font-bold text-black">
            Showing {(currentPage - 1) * (filters.limit || 20) + 1} to{' '}
            {Math.min(currentPage * (filters.limit || 20), total)} of {total} cases
            <label className="inline-flex items-center gap-2 text-xs font-black uppercase text-black/70">
              Rows
              <select
                value={filters.limit || 20}
                onChange={(event) => {
                  const nextLimit = Number(event.target.value);
                  dispatch(clearCaseSelection());
                  dispatch(setFilters({ limit: nextLimit, page: 1 }));
                  syncUrl({ limit: nextLimit, page: 1 });
                }}
                className="border-2 border-black bg-white px-2 py-1 text-xs font-black uppercase focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-2 border-black bg-white text-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-[var(--loop-yellow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {paginationPages[0] !== 1 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="border-2 border-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] bg-white text-black hover:bg-[var(--loop-yellow)] transition-colors"
                  >
                    1
                  </button>
                  <span className="text-sm font-black text-black/60">…</span>
                </>
              )}
              {paginationPages.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`border-2 border-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-colors ${
                    currentPage === page
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-[var(--loop-yellow)]'
                  }`}
                >
                  {page}
                </button>
              ))}
              {paginationPages[paginationPages.length - 1] !== totalPages && (
                <>
                  <span className="text-sm font-black text-black/60">…</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="border-2 border-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] bg-white text-black hover:bg-[var(--loop-yellow)] transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-2 border-black bg-white text-black px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-[var(--loop-yellow)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </div>
    </NeoBrutalistLayout>
  );
};

export default CaseList;
