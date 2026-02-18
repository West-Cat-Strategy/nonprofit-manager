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
} from '../../../store/slices/accountsSlice';
import type { Account } from '../../../store/slices/accountsSlice';
import {
  PeopleListContainer,
  FilterPanel,
  BulkActionBar,
  ImportExportModal,
  type TableColumn,
} from '../../../components/people';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useBulkSelect, useImportExport } from '../../../hooks';
import { BrutalBadge } from '../../../components/neo-brutalist';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';

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

  const { exportToCSV } = useImportExport();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || filters.search || '');
  const [accountTypeFilter, setAccountTypeFilter] = useState(searchParams.get('type') || filters.account_type || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || filters.category || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || (filters.is_active ? 'active' : 'inactive'));
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page') || '1'));
  const [currentLimit] = useState(Number(searchParams.get('limit') || String(pagination.limit || 20)));
  const [sortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder] = useState<'asc' | 'desc'>((searchParams.get('sort_order') as 'asc' | 'desc') || 'desc');
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
        search: searchInput || undefined,
        account_type: accountTypeFilter || undefined,
        category: categoryFilter || undefined,
        is_active: resolvedIsActive,
      })
    );
  }, [dispatch, currentPage, currentLimit, searchInput, accountTypeFilter, categoryFilter, resolvedIsActive]);

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
      setAccountTypeFilter(value);
    } else if (filterId === 'category' && typeof value === 'string') {
      setCategoryFilter(value);
    } else if (filterId === 'status' && typeof value === 'string') {
      setStatusFilter(value);
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

  const handleBulkExport = () => {
    const ids = Array.from(selectedIds);
    const selectedAccounts = accounts.filter((a) => ids.includes(a.account_id));

    const columns = [
      'account_number',
      'account_name',
      'account_type',
      'category',
      'email',
    ] as const;

    exportToCSV(
      selectedAccounts.map((a) => ({
        account_number: a.account_number,
        account_name: a.account_name,
        account_type: a.account_type,
        category: a.category,
        email: a.email,
      })),
      columns as any,
      {
        filename: 'accounts-export',
        includeHeaders: true,
      }
    );
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
                  onClick: handleBulkExport,
                },
                {
                  id: 'import',
                  label: 'Import',
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
        sampleData={accounts}
      />
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
};

export default AccountList;
