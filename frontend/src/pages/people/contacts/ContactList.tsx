/**
 * Contact List Page
 * Displays all contacts with advanced filtering, bulk operations, and import/export
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useBulkSelect, useImportExport } from '../../../hooks';
import { BrutalBadge } from '../../../components/neo-brutalist';

const ContactList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
  const [searchInput, setSearchInput] = useState(filters.search);
  const [roleFilter, setRoleFilter] = useState(filters.role);
  const [activeFilter, setActiveFilter] = useState(
    filters.is_active === true ? 'active' : filters.is_active === false ? 'inactive' : ''
  );
  const [showImportExport, setShowImportExport] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  const loadContacts = useCallback(() => {
    dispatch(
      fetchContacts({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        is_active: filters.is_active ?? undefined,
        role: filters.role || undefined,
      })
    );
  }, [dispatch, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    dispatch(fetchContactTags());
  }, [dispatch]);

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    if (filterId === 'search' && typeof value === 'string') {
      setSearchInput(value);
    } else if (filterId === 'role' && typeof value === 'string') {
      setRoleFilter(value as any);
    } else if (filterId === 'is_active' && typeof value === 'string') {
      setActiveFilter(value);
    }
  };

  const handleApplyFilters = () => {
    let isActive: boolean | null = null;
    if (activeFilter === 'active') {
      isActive = true;
    } else if (activeFilter === 'inactive') {
      isActive = false;
    }

    dispatch(
      setFilters({
        search: searchInput,
        role: roleFilter,
        is_active: isActive,
      })
    );
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setRoleFilter('');
    setActiveFilter('');
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
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedCount} contact(s)?`
      )
    ) {
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
      columns as any,
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
              {row.tags.slice(0, 2).map((tag: any, idx: number) => (
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
            className="text-indigo-600 hover:text-indigo-900 font-mono text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Remove ${row.first_name} ${row.last_name}?`
                )
              ) {
                dispatch(deleteContact(row.contact_id));
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
        title="Contacts"
        description="Manage all organizational contacts and relationships"
        onCreateNew={() => navigate('/contacts/new')}
        createButtonLabel="New Contact"
        filters={
          <FilterPanel
            fields={[
              {
                id: 'search',
                label: 'Search',
                type: 'text',
                placeholder: 'Name, email, or company...',
                value: searchInput,
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
        onPageChange={(page) =>
          dispatch(
            fetchContacts({
              page,
              limit: pagination.limit,
              search: filters.search || undefined,
              is_active: filters.is_active ?? undefined,
              role: filters.role || undefined,
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
        emptyStateTitle="No contacts found"
        emptyStateDescription="Get started by creating your first contact"
        emptyStateAction={{
          label: 'Create First Contact',
          onClick: () => navigate('/contacts/new'),
        }}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="contacts"
        sampleData={contacts}
      />
    </>
  );
};

export default ContactList;
