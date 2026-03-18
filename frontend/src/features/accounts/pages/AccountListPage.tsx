/**
 * Account List Page
 * Displays all accounts with advanced filtering, bulk operations, and import/export
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchAccounts,
  deleteAccount,
  setFilters,
  clearFilters,
} from '../state';
import type { Account } from '../state';
import {
  ACCOUNT_CATEGORY_VALUES,
  ACCOUNT_TYPE_VALUES,
} from '../types/contracts';
import {
  PeopleListContainer,
  FilterPanel,
  BulkActionBar,
  ImportExportModal,
  type TableColumn,
} from '../../people';
import { SecondaryButton } from '../../../components/ui';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useBulkSelect } from '../../../hooks';
import { useDebounce } from '../../../hooks/useVirtualList';
import { BrutalBadge } from '../../../components/neo-brutalist';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import {
  parseAllowedValue,
  parseAllowedValueOrEmpty,
  parsePositiveInteger,
} from '../../../utils/persistedFilters';

const STATUS_FILTER_VALUES = ['active', 'inactive'] as const;
const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

const AccountList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accounts, loading, error, pagination, filters } = useAppSelector(
    (state) => state.accounts
  );

  const {
    selectedIds,
    selectedCount,
    toggleRow,
    selectAll,
    deselectAll,
  } = useBulkSelect();

  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || filters.search || '');
  const debouncedSearchInput = useDebounce(searchInput, 300);
  const [accountTypeFilter, setAccountTypeFilter] = useState<'' | Account['account_type']>(
    () =>
      parseAllowedValueOrEmpty(searchParams.get('type'), ACCOUNT_TYPE_VALUES) ||
      filters.account_type ||
      ''
  );
  const [categoryFilter, setCategoryFilter] = useState<'' | Account['category']>(
    () =>
      parseAllowedValueOrEmpty(searchParams.get('category'), ACCOUNT_CATEGORY_VALUES) ||
      filters.category ||
      ''
  );
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER_VALUES)[number]>(
    () =>
      parseAllowedValue(searchParams.get('status'), STATUS_FILTER_VALUES) ||
      (filters.is_active ? 'active' : 'inactive')
  );
  const [currentPage, setCurrentPage] = useState(() => parsePositiveInteger(searchParams.get('page'), 1));
  const [currentLimit] = useState(() =>
    parsePositiveInteger(searchParams.get('limit'), pagination.limit || 20)
  );
  const [sortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder] = useState<'asc' | 'desc'>(
    () => parseAllowedValue(searchParams.get('sort_order'), SORT_ORDER_VALUES) || 'desc'
  );
  const [showImportExport, setShowImportExport] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  const resolvedIsActive =
    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;
  const hasActiveFilters = Boolean(searchInput || accountTypeFilter || categoryFilter || statusFilter !== 'active');

  const loadAccounts = useCallback(() => {
    dispatch(
        fetchAccounts({
          page: currentPage,
          limit: currentLimit,
          search: debouncedSearchInput || undefined,
          account_type: accountTypeFilter || undefined,
          category: categoryFilter || undefined,
          is_active: resolvedIsActive,
        })
      );
  }, [dispatch, currentPage, currentLimit, debouncedSearchInput, accountTypeFilter, categoryFilter, resolvedIsActive]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (accountTypeFilter) params.set('type', accountTypeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (currentLimit !== 20) params.set('limit', String(currentLimit));
    if (sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    setSearchParams(params, { replace: true });
  }, [searchInput, accountTypeFilter, statusFilter, categoryFilter, currentPage, currentLimit, sortBy, sortOrder, setSearchParams]);

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    if (filterId === 'search' && typeof value === 'string') {
      setSearchInput(value);
    } else if (filterId === 'account_type' && typeof value === 'string') {
      setAccountTypeFilter(parseAllowedValueOrEmpty(value, ACCOUNT_TYPE_VALUES));
    } else if (filterId === 'category' && typeof value === 'string') {
      setCategoryFilter(parseAllowedValueOrEmpty(value, ACCOUNT_CATEGORY_VALUES));
    } else if (filterId === 'status' && typeof value === 'string') {
      setStatusFilter(parseAllowedValue(value, STATUS_FILTER_VALUES) || 'active');
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    dispatch(
      setFilters({
        search: searchInput,
        account_type: accountTypeFilter,
        category: categoryFilter,
        is_active:
          statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : true,
      })
    );
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setAccountTypeFilter('');
    setCategoryFilter('');
    setStatusFilter('active');
    setCurrentPage(1);
    dispatch(clearFilters());
  };

  const handleSelectAll = () => {
    if (selectedCount === accounts.length) {
      deselectAll();
    } else {
      selectAll(accounts.map((a) => a.account_id));
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      ...confirmPresets.delete(`${selectedCount} Account${selectedCount > 1 ? 's' : ''}`),
      message: `Are you sure you want to delete ${selectedCount} account(s)? This action cannot be undone.`,
    });
    if (!confirmed) {
      return;
    }

    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await dispatch(deleteAccount(id));
    }

    deselectAll();
    loadAccounts();
  };

  const columns: TableColumn<Account>[] = [
    {
      key: 'account_number',
      label: 'Number',
      width: '140px',
      render: (_, row) => (
        <span className="font-mono text-sm font-medium">
          {row.account_number}
        </span>
      ),
    },
    {
      key: 'account_name',
      label: 'Name',
      width: '240px',
      render: (_, row) => (
        <div>
          <Link
            to={`/accounts/${row.account_id}`}
            className="text-app-accent hover:text-app-accent-text font-medium"
          >
            {row.account_name}
          </Link>
        </div>
      ),
    },
    {
      key: 'account_type',
      label: 'Type',
      width: '120px',
      render: (_, row) => (
        <BrutalBadge color="blue" className="text-xs capitalize">
          {row.account_type}
        </BrutalBadge>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: '140px',
      render: (_, row) => (
        <span className="px-3 py-1 text-xs font-medium rounded bg-app-surface-muted text-app-text capitalize">
          {row.category}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      width: '220px',
      render: (_, row) => (
        <span className="text-sm text-app-text-muted">{row.email || '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/accounts/${row.account_id}/edit`)}
            className="px-2 py-1 border border-app-border rounded text-app-text text-xs font-mono hover:bg-app-surface-muted transition"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirm(confirmPresets.delete(row.account_name));
              if (confirmed) {
                dispatch(deleteAccount(row.account_id));
              }
            }}
            className="px-2 py-1 border border-app-border rounded text-app-text text-xs font-mono hover:bg-app-accent-soft hover:text-app-accent-text transition"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PeopleListContainer
        title="Accounts"
        description="Manage organizational and individual accounts"
        getRowId={(row) => row.account_id}
        headerActions={
          <SecondaryButton onClick={() => setShowImportExport(true)}>
            Import / Export
          </SecondaryButton>
        }
        onCreateNew={() => navigate('/accounts/new')}
        createButtonLabel="New Account"
        filters={
          <FilterPanel
            fields={[
              {
                id: 'search',
                label: 'Search',
                type: 'text',
                placeholder: 'Account name, number, or email...',
                value: searchInput,
                ariaLabel: 'Search accounts',
              },
              {
                id: 'status',
                label: 'Status',
                type: 'select',
                value: statusFilter,
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              },
              {
                id: 'account_type',
                label: 'Type',
                type: 'select',
                value: accountTypeFilter,
                options: [
                  { value: 'organization', label: 'Organization' },
                  { value: 'individual', label: 'Individual' },
                ],
              },
              {
                id: 'category',
                label: 'Category',
                type: 'select',
                value: categoryFilter,
                options: [
                  { value: 'donor', label: 'Donor' },
                  { value: 'volunteer', label: 'Volunteer' },
                  { value: 'partner', label: 'Partner' },
                  { value: 'vendor', label: 'Vendor' },
                  { value: 'beneficiary', label: 'Beneficiary' },
                  { value: 'other', label: 'Other' },
                ],
              },
            ]}
            onFilterChange={handleFilterChange}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            applyLabel="Search"
            isCollapsed={filterCollapsed}
            onToggleCollapse={() => setFilterCollapsed(!filterCollapsed)}
            activeFilterCount={
              [searchInput, accountTypeFilter, categoryFilter, statusFilter !== 'active' ? statusFilter : ''].filter(
                (f) => f
              ).length
            }
          />
        }
        loading={loading}
        error={error || undefined}
        data={accounts}
        columns={columns}
        pagination={{
          ...pagination,
          totalPages: pagination.total_pages,
        }}
        onPageChange={(page) => setCurrentPage(page)}
        selectedRows={selectedIds}
        onSelectRow={(id) => toggleRow(id)}
        onSelectAll={handleSelectAll}
        bulkActions={
          selectedCount > 0 && (
            <BulkActionBar
              selectedCount={selectedCount}
              actions={[
                {
                  id: 'export',
                  label: 'Export',
                  onClick: () => setShowImportExport(true),
                },
                {
                  id: 'delete',
                  label: 'Delete',
                  variant: 'danger',
                  onClick: handleBulkDelete,
                },
              ]}
              onClearSelection={deselectAll}
            />
          )
        }
        emptyStateTitle="No accounts found"
        emptyStateDescription={
          hasActiveFilters
            ? 'No accounts match your current filters. Clear filters to see all accounts.'
            : 'No accounts have been added yet.'
        }
        emptyStateAction={{
          label: hasActiveFilters ? 'Create New Account' : 'Create First Account',
          onClick: () => navigate('/accounts/new'),
        }}
        emptyStateSecondaryAction={
          hasActiveFilters
            ? {
                label: 'Clear Filters',
                onClick: handleClearFilters,
              }
            : undefined
        }
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="accounts"
        selectedIds={Array.from(selectedIds)}
        exportRequest={{
          search: searchInput || undefined,
          account_type: accountTypeFilter || undefined,
          category: categoryFilter || undefined,
          is_active: resolvedIsActive,
          sort_by: sortBy,
          sort_order: sortOrder,
        }}
        onImportComplete={() => {
          deselectAll();
          loadAccounts();
        }}
      />
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
};

export default AccountList;
