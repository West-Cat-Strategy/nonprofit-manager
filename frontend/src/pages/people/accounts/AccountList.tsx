/**
 * Account List Page
 * Displays all accounts with advanced filtering, bulk operations, and import/export
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '../../../components/people';
import { useBulkSelect, useImportExport } from '../../../hooks';
import { BrutalBadge } from '../../../components/neo-brutalist';
import type { TableColumn } from '../../../types/people';

const AccountList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
  const [searchInput, setSearchInput] = useState(filters.search);
  const [accountTypeFilter, setAccountTypeFilter] = useState(
    filters.account_type
  );
  const [categoryFilter, setCategoryFilter] = useState(filters.category);
  const [showImportExport, setShowImportExport] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  const loadAccounts = useCallback(() => {
    dispatch(
      fetchAccounts({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        account_type: filters.account_type || undefined,
        category: filters.category || undefined,
        is_active: filters.is_active,
      })
    );
  }, [dispatch, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleFilterChange = (filterId: string, value: string) => {
    if (filterId === 'search') {
      setSearchInput(value);
    } else if (filterId === 'account_type') {
      setAccountTypeFilter(value);
    } else if (filterId === 'category') {
      setCategoryFilter(value);
    }
  };

  const handleApplyFilters = () => {
    dispatch(
      setFilters({
        search: searchInput,
        account_type: accountTypeFilter,
        category: categoryFilter,
      })
    );
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setAccountTypeFilter('');
    setCategoryFilter('');
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
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedCount} account(s)?`
      )
    ) {
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
      columns,
      {
        filename: 'accounts-export',
        includeHeaders: true,
      }
    );
  };

  const columns: TableColumn[] = [
    {
      key: 'account_number',
      label: 'Number',
      width: '140px',
      render: (_, row: Account) => (
        <span className="font-mono text-sm font-medium">
          {row.account_number}
        </span>
      ),
    },
    {
      key: 'account_name',
      label: 'Name',
      width: '240px',
      render: (_, row: Account) => (
        <div
          className="cursor-pointer hover:opacity-75 transition"
          onClick={() => navigate(`/accounts/${row.account_id}`)}
        >
          <p className="text-blue-600 hover:text-blue-900 font-medium">
            {row.account_name}
          </p>
          <p className="text-sm text-gray-500">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      key: 'account_type',
      label: 'Type',
      width: '120px',
      render: (_, row: Account) => (
        <BrutalBadge variant="primary" className="text-xs capitalize">
          {row.account_type}
        </BrutalBadge>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      width: '140px',
      render: (_, row: Account) => (
        <span className="px-3 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 capitalize">
          {row.category}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      width: '220px',
      render: (_, row: Account) => (
        <span className="text-sm text-gray-600">{row.email || '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: (_, row: Account) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/accounts/${row.account_id}/edit`)}
            className="text-indigo-600 hover:text-indigo-900 font-mono text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Remove ${row.account_name}?`)) {
                dispatch(deleteAccount(row.account_id));
              }
            }}
            className="text-red-600 hover:text-red-900 font-mono text-sm"
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
            isCollapsed={filterCollapsed}
            onToggleCollapse={() => setFilterCollapsed(!filterCollapsed)}
            activeFilterCount={
              [searchInput, accountTypeFilter, categoryFilter].filter(
                (f) => f
              ).length
            }
          />
        }
        loading={loading}
        error={error}
        data={accounts.map((a) => ({ ...a, id: a.account_id }))}
        columns={columns}
        pagination={pagination}
        onPageChange={(page) =>
          dispatch(
            fetchAccounts({
              page,
              limit: pagination.limit,
              search: filters.search || undefined,
              account_type: filters.account_type || undefined,
              category: filters.category || undefined,
              is_active: filters.is_active,
            })
          )
        }
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
        emptyStateDescription="Get started by creating your first account"
        emptyStateAction={{
          label: 'Create First Account',
          onClick: () => navigate('/accounts/new'),
        }}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="accounts"
        sampleData={accounts}
      />
    </>
  );
};

export default AccountList;
