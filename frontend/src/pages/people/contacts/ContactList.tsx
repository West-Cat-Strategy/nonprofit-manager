/**
 * Contact List Page
 * Displays all contacts with advanced filtering, bulk operations, and import/export
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchContacts,
  deleteContact,
  setFilters,
  clearFilters,
  fetchContactTags,
} from '../../../store/slices/contactsSlice';
import type { Contact } from '../../../store/slices/contactsSlice';
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

const ContactList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contacts, loading, error, pagination, filters } = useAppSelector(
    (state) => state.contacts
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
  const [roleFilter, setRoleFilter] = useState(searchParams.get('type') || filters.role || '');
  const [activeFilter, setActiveFilter] = useState(
    searchParams.get('status') ||
      (filters.is_active === true ? 'active' : filters.is_active === false ? 'inactive' : '')
  );
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page') || '1'));
  const [currentLimit] = useState(Number(searchParams.get('limit') || String(pagination.limit || 20)));
  const [sortBy] = useState(searchParams.get('sort_by') || filters.sort_by || 'created_at');
  const [sortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sort_order') as 'asc' | 'desc') || filters.sort_order || 'desc'
  );
  const [showImportExport, setShowImportExport] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  const resolvedIsActive =
    activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined;
  const hasActiveFilters = Boolean(searchInput || roleFilter || activeFilter);

  const loadContacts = useCallback(() => {
    dispatch(
      fetchContacts({
        page: currentPage,
        limit: currentLimit,
        search: searchInput || undefined,
        is_active: resolvedIsActive,
        role: (roleFilter as 'staff' | 'volunteer' | 'board') || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
    );
  }, [dispatch, currentPage, currentLimit, searchInput, resolvedIsActive, roleFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (roleFilter) params.set('type', roleFilter);
    if (activeFilter) params.set('status', activeFilter);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (currentLimit !== 20) params.set('limit', String(currentLimit));
    if (sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    setSearchParams(params, { replace: true });
  }, [searchInput, roleFilter, activeFilter, currentPage, currentLimit, sortBy, sortOrder, setSearchParams]);

  useEffect(() => {
    dispatch(fetchContactTags());
  }, [dispatch]);

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    if (filterId === 'search' && typeof value === 'string') {
      setSearchInput(value);
    } else if (filterId === 'role' && typeof value === 'string') {
      setRoleFilter(value);
    } else if (filterId === 'is_active' && typeof value === 'string') {
      setActiveFilter(value);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    dispatch(
      setFilters({
        search: searchInput,
        role: roleFilter as '' | 'staff' | 'volunteer' | 'board',
        is_active: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : null,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
    );
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setRoleFilter('');
    setActiveFilter('');
    setCurrentPage(1);
    dispatch(clearFilters());
  };

  const handleSelectAll = () => {
    if (selectedCount === contacts.length) {
      deselectAll();
    } else {
      selectAll(contacts.map((c) => c.contact_id));
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      ...confirmPresets.delete(`${selectedCount} Contact${selectedCount > 1 ? 's' : ''}`),
      message: `Are you sure you want to delete ${selectedCount} contact(s)? This action cannot be undone.`,
    });
    if (!confirmed) {
      return;
    }

    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await dispatch(deleteContact(id));
    }

    deselectAll();
    loadContacts();
  };

  const handleBulkExport = () => {
    const ids = Array.from(selectedIds);
    const selectedContacts = contacts.filter((c) =>
      ids.includes(c.contact_id)
    );

    const columns = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'job_title',
      'department',
      'account_name',
      'role',
    ] as const;

    exportToCSV(
      selectedContacts.map((c) => ({
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        job_title: c.job_title,
        department: c.department,
        account_name: c.account_name,
        role: c.roles?.join(', ') || '',
      })),
      columns,
      {
        filename: 'contacts-export',
        includeHeaders: true,
      }
    );
  };

  const columns: TableColumn<Contact>[] = [
    {
      key: 'full_name',
      label: 'Name',
      width: '220px',
      render: (_, row) => (
        <div
          className="cursor-pointer hover:opacity-75 transition"
          onClick={() => navigate(`/contacts/${row.contact_id}`)}
        >
          <p className="text-app-accent hover:text-app-accent-text font-medium">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-sm text-app-text-muted">{row.email || 'No email'}</p>
        </div>
      ),
    },
    {
      key: 'job_title',
      label: 'Role',
      width: '160px',
      render: (_, row) => (
        <div className="text-sm">
          <p className="font-medium">{row.job_title || '—'}</p>
          <p className="text-app-text-muted">{row.department || '—'}</p>
        </div>
      ),
    },
    {
      key: 'account_name',
      label: 'Account',
      width: '180px',
      render: (_, row) => (
        <span className="text-sm text-app-text-muted">{row.account_name || '—'}</span>
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      width: '160px',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags && row.tags.length > 0 ? (
            <>
              {row.tags.slice(0, 2).map((tag: string, idx: number) => (
                <BrutalBadge key={idx} color="blue" className="text-xs">
                  {tag}
                </BrutalBadge>
              ))}
              {row.tags.length > 2 && (
                <span className="text-xs text-app-text-muted">+{row.tags.length - 2}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-app-text-subtle">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      width: '100px',
      render: (_, row) => (
        <span
          className={`px-3 py-1 text-xs font-medium rounded ${row.is_active
            ? 'bg-green-100 text-green-800'
            : 'bg-app-surface-muted text-app-text'
            }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/contacts/${row.contact_id}/edit`)}
            className="px-2 py-1 border border-app-border rounded text-app-text text-xs font-mono hover:bg-app-surface-muted transition"
          >
            Edit
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirm(
                confirmPresets.delete(`${row.first_name} ${row.last_name}`)
              );
              if (confirmed) {
                dispatch(deleteContact(row.contact_id));
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
        title="People"
        description="Manage all organizational contacts and relationships"
        getRowId={(row) => row.contact_id}
        onCreateNew={() => navigate('/contacts/new')}
        createButtonLabel="New Person"
        filters={
          <FilterPanel
            fields={[
              {
                id: 'search',
                label: 'Search',
                type: 'text',
                placeholder: 'Quick lookup...',
                value: searchInput,
                ariaLabel: 'Search contacts',
              },
              {
                id: 'role',
                label: 'Role',
                type: 'select',
                value: roleFilter,
                options: [
                  { value: 'staff', label: 'Staff' },
                  { value: 'volunteer', label: 'Volunteer' },
                  { value: 'board', label: 'Board' },
                ],
              },
              {
                id: 'is_active',
                label: 'Status',
                type: 'select',
                value: activeFilter,
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
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
              [searchInput, roleFilter, activeFilter].filter((f) => f).length
            }
          />
        }
        loading={loading}
        error={error || undefined}
        data={contacts}
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
        emptyStateTitle="No contacts found"
        emptyStateDescription={
          hasActiveFilters
            ? 'No contacts match your current filters. Clear filters to see all contacts.'
            : 'No contacts have been added yet.'
        }
        emptyStateAction={{
          label: hasActiveFilters ? 'Create New Contact' : 'Create First Contact',
          onClick: () => navigate('/contacts/new'),
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
        entityType="contacts"
        sampleData={contacts}
      />
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
};

export default ContactList;
