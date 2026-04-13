/**
 * Volunteer List Page
 * Displays all volunteers with advanced filtering, bulk operations, and import/export
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchVolunteers,
  deleteVolunteer,
  setFilters,
  clearFilters,
} from '../state';
import type { Volunteer } from '../state';
import {
  VOLUNTEER_AVAILABILITY_STATUS_VALUES,
  VOLUNTEER_BACKGROUND_CHECK_STATUS_VALUES,
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
import { BrutalBadge } from '../../../components/neo-brutalist';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import {
  parseAllowedValue,
  parseAllowedValueOrEmpty,
  parsePositiveInteger,
} from '../../../utils/persistedFilters';

const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

const VolunteerList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { volunteers, loading, error, pagination, filters } = useAppSelector(
    (state) => state.volunteers.list
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
  const [availabilityFilter, setAvailabilityFilter] = useState<
    '' | Volunteer['availability_status']
  >(
    () =>
      parseAllowedValueOrEmpty(searchParams.get('status'), VOLUNTEER_AVAILABILITY_STATUS_VALUES) ||
      filters.availability_status ||
      ''
  );
  const [backgroundCheckFilter, setBackgroundCheckFilter] = useState<
    '' | Volunteer['background_check_status']
  >(
    () =>
      parseAllowedValueOrEmpty(
        searchParams.get('type'),
        VOLUNTEER_BACKGROUND_CHECK_STATUS_VALUES
      ) ||
      filters.background_check_status ||
      ''
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
  const hasActiveFilters = Boolean(searchInput || availabilityFilter || backgroundCheckFilter);

  const loadVolunteers = useCallback(() => {
    dispatch(
      fetchVolunteers({
        page: currentPage,
        limit: currentLimit,
        search: searchInput || undefined,
        availability_status: availabilityFilter || undefined,
        background_check_status: backgroundCheckFilter || undefined,
      })
    );
  }, [dispatch, currentPage, currentLimit, searchInput, availabilityFilter, backgroundCheckFilter]);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchInput) params.set('search', searchInput);
    if (availabilityFilter) params.set('status', availabilityFilter);
    if (backgroundCheckFilter) params.set('type', backgroundCheckFilter);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (currentLimit !== 20) params.set('limit', String(currentLimit));
    if (sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    setSearchParams(params, { replace: true });
  }, [searchInput, availabilityFilter, backgroundCheckFilter, currentPage, currentLimit, sortBy, sortOrder, setSearchParams]);

  const handleFilterChange = (filterId: string, value: string | string[]) => {
    if (filterId === 'search' && typeof value === 'string') {
      setSearchInput(value);
    } else if (filterId === 'availability_status' && typeof value === 'string') {
      setAvailabilityFilter(
        parseAllowedValueOrEmpty(value, VOLUNTEER_AVAILABILITY_STATUS_VALUES)
      );
    } else if (filterId === 'background_check_status' && typeof value === 'string') {
      setBackgroundCheckFilter(
        parseAllowedValueOrEmpty(value, VOLUNTEER_BACKGROUND_CHECK_STATUS_VALUES)
      );
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    dispatch(
      setFilters({
        search: searchInput,
        availability_status: availabilityFilter,
        background_check_status: backgroundCheckFilter,
      })
    );
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setAvailabilityFilter('');
    setBackgroundCheckFilter('');
    setCurrentPage(1);
    dispatch(clearFilters());
  };

  const handleSelectAll = () => {
    if (selectedCount === volunteers.length) {
      deselectAll();
    } else {
      selectAll(volunteers.map((v) => v.volunteer_id));
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      ...confirmPresets.delete(`${selectedCount} Volunteer${selectedCount > 1 ? 's' : ''}`),
      message: `Are you sure you want to delete ${selectedCount} volunteer(s)? This action cannot be undone.`,
    });
    if (!confirmed) {
      return;
    }

    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await dispatch(deleteVolunteer(id));
    }

    deselectAll();
    loadVolunteers();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text', label: 'Available' },
      unavailable: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text', label: 'Unavailable' },
      limited: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text', label: 'Limited' },
    };
    return statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-app-surface-muted',
      text: 'text-app-text',
      label: status,
    };
  };

  const getBackgroundCheckBadge = (status: string) => {
    const statusConfig = {
      not_required: { bg: 'bg-app-surface-muted', text: 'text-app-text' },
      pending: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text' },
      in_progress: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text' },
      approved: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text' },
      rejected: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text' },
      expired: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text' },
    };
    return statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-app-surface-muted',
      text: 'text-app-text',
    };
  };

  const columns: TableColumn<Volunteer>[] = [
    {
      key: 'name',
      label: 'Name',
      width: '280px',
      render: (_, row: Volunteer) => (
        <div
          className="cursor-pointer hover:opacity-75 transition"
          onClick={() => navigate(`/volunteers/${row.volunteer_id}`)}
        >
          <p className="text-app-accent hover:text-app-accent-text font-medium">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-sm text-app-text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'skills',
      label: 'Skills',
      width: '180px',
      render: (_, row: Volunteer) => (
        <div className="flex flex-wrap gap-1">
          {row.skills && row.skills.length > 0 ? (
            <>
              {row.skills.slice(0, 2).map((skill, idx) => (
                <BrutalBadge key={idx} color="blue" className="text-xs">
                  {skill}
                </BrutalBadge>
              ))}
              {row.skills.length > 2 && (
                <span className="text-xs text-app-text-muted">
                  +{row.skills.length - 2}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-app-text-subtle">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'availability_status',
      label: 'Availability',
      width: '140px',
      render: (_, row: Volunteer) => {
        const config = getStatusBadge(row.availability_status);
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded ${config.bg} ${config.text}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'background_check_status',
      label: 'Background Check',
      width: '160px',
      render: (_, row: Volunteer) => {
        const config = getBackgroundCheckBadge(row.background_check_status);
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded ${config.bg} ${config.text}`}>
            {row.background_check_status.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'total_hours_logged',
      label: 'Hours',
      width: '100px',
      render: (_, row: Volunteer) => (
        <span className="font-mono text-sm">{row.total_hours_logged || 0}h</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: (_, row: Volunteer) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/volunteers/${row.volunteer_id}/edit`)}
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
                dispatch(deleteVolunteer(row.volunteer_id));
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
        title="Volunteers"
        description="Manage volunteer profiles and assignments"
        getRowId={(row) => row.volunteer_id}
        headerActions={
          <SecondaryButton onClick={() => setShowImportExport(true)}>
            Import / Export
          </SecondaryButton>
        }
        onCreateNew={() => navigate('/volunteers/new')}
        createButtonLabel="New Volunteer"
        filters={
          <FilterPanel
            fields={[
              {
                id: 'search',
                label: 'Search',
                type: 'text',
                placeholder: 'Name, email, or phone...',
                value: searchInput,
              },
              {
                id: 'availability_status',
                label: 'Availability',
                type: 'select',
                value: availabilityFilter,
                options: [
                  { value: 'available', label: 'Available' },
                  { value: 'limited', label: 'Limited' },
                  { value: 'unavailable', label: 'Unavailable' },
                ],
              },
              {
                id: 'background_check_status',
                label: 'Background Check',
                type: 'select',
                value: backgroundCheckFilter,
                options: [
                  { value: 'approved', label: 'Approved' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'not_required', label: 'Not Required' },
                ],
              },
            ]}
            onFilterChange={handleFilterChange}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            isCollapsed={filterCollapsed}
            onToggleCollapse={() => setFilterCollapsed(!filterCollapsed)}
            activeFilterCount={
              [searchInput, availabilityFilter, backgroundCheckFilter].filter(
                (f) => f
              ).length
            }
          />
        }
        loading={loading}
        error={error || undefined}
        data={volunteers.map((v) => ({ ...v, id: v.volunteer_id }))}
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
        emptyStateTitle="No volunteers found"
        emptyStateDescription={
          hasActiveFilters
            ? 'No volunteers match your current filters. Clear filters to see all volunteers.'
            : 'No volunteers have been added yet.'
        }
        emptyStateAction={{
          label: hasActiveFilters ? 'Create New Volunteer' : 'Create First Volunteer',
          onClick: () => navigate('/volunteers/new'),
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
        entityType="volunteers"
        selectedIds={Array.from(selectedIds)}
        exportRequest={{
          search: searchInput || undefined,
          availability_status: availabilityFilter || undefined,
          background_check_status: backgroundCheckFilter || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        }}
        onImportComplete={() => {
          deselectAll();
          loadVolunteers();
        }}
      />
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
};

export default VolunteerList;
