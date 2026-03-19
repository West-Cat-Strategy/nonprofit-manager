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
} from '../state';
import type { Contact } from '../state';
import type { ContactRoleFilter } from '../types/contracts';
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
  parsePositiveInteger,
} from '../../../utils/persistedFilters';

const ROLE_FILTER_OPTIONS: Array<{ value: ContactRoleFilter; label: string }> = [
  { value: 'client', label: 'Client' },
  { value: 'donor', label: 'Donor' },
  { value: 'support_person', label: 'Support Person' },
  { value: 'staff', label: 'Staff' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'board', label: 'Board' },
];

const isContactRoleFilter = (value: string): value is ContactRoleFilter =>
  ROLE_FILTER_OPTIONS.some((option) => option.value === value);

const STATUS_FILTER_VALUES = ['active', 'inactive'] as const;
const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

const normalizeRoleFilter = (value: string | null | undefined): ContactRoleFilter | '' => {
  if (!value) {
    return '';
  }

  return isContactRoleFilter(value) ? value : '';
};

const ContactList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contacts, loading, error, pagination, filters } = useAppSelector(
    (state) => state.contactsV2
  );
  const initialRoleFilter = normalizeRoleFilter(searchParams.get('type'));

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
  const [roleFilter, setRoleFilter] = useState<ContactRoleFilter | ''>(
    initialRoleFilter || filters.role || ''
  );
  const [activeFilter, setActiveFilter] = useState(
    parseAllowedValue(searchParams.get('status'), STATUS_FILTER_VALUES) ||
      (filters.is_active === true ? 'active' : filters.is_active === false ? 'inactive' : '')
  );
  const [currentPage, setCurrentPage] = useState(() => parsePositiveInteger(searchParams.get('page'), 1));
  const [currentLimit] = useState(() =>
    parsePositiveInteger(searchParams.get('limit'), pagination.limit || 20)
  );
  const [sortBy] = useState(searchParams.get('sort_by') || filters.sort_by || 'created_at');
  const [sortOrder] = useState<'asc' | 'desc'>(
    parseAllowedValue(searchParams.get('sort_order'), SORT_ORDER_VALUES) || filters.sort_order || 'desc'
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
          search: debouncedSearchInput || undefined,
          is_active: resolvedIsActive,
          role: roleFilter || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        })
      );
  }, [dispatch, currentPage, currentLimit, debouncedSearchInput, resolvedIsActive, roleFilter, sortBy, sortOrder]);

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

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    if (filterId === 'search' && typeof value === 'string') {
      setSearchInput(value);
    } else if (filterId === 'role' && typeof value === 'string') {
      setRoleFilter(normalizeRoleFilter(value));
    } else if (filterId === 'is_active' && typeof value === 'string') {
      setActiveFilter(value);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    dispatch(
      setFilters({
        search: searchInput,
        role: roleFilter,
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
            ? 'bg-app-accent-soft text-app-accent-text'
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

  const renderContactCard = useCallback(
    (contact: Contact) => (
      <div data-testid="mobile-contact-card" className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-app-text">
                {contact.first_name} {contact.last_name}
              </p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  contact.is_active
                    ? 'bg-app-accent-soft text-app-accent-text'
                    : 'bg-app-surface-muted text-app-text-muted'
                }`}
              >
                {contact.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-app-text-muted">{contact.email || 'No email on file'}</p>
            {contact.account_name ? (
              <p className="text-sm text-app-text-muted">Account: {contact.account_name}</p>
            ) : null}
          </div>
          <details className="shrink-0">
            <summary className="cursor-pointer rounded-full border border-app-border px-3 py-1 text-xs font-semibold text-app-text transition hover:bg-app-surface-muted">
              Actions
            </summary>
            <div className="mt-2 grid min-w-32 gap-2">
              <button
                type="button"
                onClick={() => navigate(`/contacts/${contact.contact_id}`)}
                className="rounded-full border border-app-border px-3 py-1 text-xs font-semibold text-app-text transition hover:bg-app-surface-muted"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => navigate(`/contacts/${contact.contact_id}/edit`)}
                className="rounded-full border border-app-border px-3 py-1 text-xs font-semibold text-app-text transition hover:bg-app-surface-muted"
              >
                Edit
              </button>
            </div>
          </details>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-app-text-muted">
          {contact.tags && contact.tags.length > 0
            ? contact.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="rounded-full border border-app-border px-2 py-0.5">
                  {tag}
                </span>
              ))
            : null}
          {contact.mobile_phone && <span>📱 {contact.mobile_phone}</span>}
        </div>
        <p className="text-xs font-medium text-app-text-subtle">Use actions to open the full record.</p>
      </div>
    ),
    [navigate]
  );

  return (
    <>
      <PeopleListContainer
        title="People"
        description="Manage all organizational contacts and relationships"
        getRowId={(row) => row.contact_id}
        headerActions={
          <SecondaryButton onClick={() => setShowImportExport(true)}>
            Import / Export
          </SecondaryButton>
        }
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
                options: ROLE_FILTER_OPTIONS,
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
        mobileCardRenderer={renderContactCard}
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
        selectedIds={Array.from(selectedIds)}
        exportRequest={{
          search: searchInput || undefined,
          role: roleFilter || undefined,
          is_active: resolvedIsActive,
          sort_by: sortBy,
          sort_order: sortOrder,
        }}
        onImportComplete={() => {
          deselectAll();
          loadContacts();
        }}
      />
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
};

export default ContactList;
