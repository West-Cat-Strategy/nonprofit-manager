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
} from '../../../store/slices/volunteersSlice';
import type { Volunteer } from '../../../store/slices/volunteersSlice';
import {
  PeopleListContainer,
  FilterPanel,
  BulkActionBar,
  ImportExportModal,
  type TableColumn,
} from '../../../components/people';
import { useBulkSelect, useImportExport } from '../../../hooks';
import { BrutalBadge } from '../../../components/neo-brutalist';

const VolunteerList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { volunteers, loading, error, pagination, filters } = useAppSelector(
    (state) => state.volunteers
  );

  const {
    selectedIds,
    selectedCount,
    toggleRow,
    selectAll,
    deselectAll,
  } = useBulkSelect();

  const { exportToCSV } = useImportExport();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || filters.search || '');
  const [availabilityFilter, setAvailabilityFilter] = useState(searchParams.get('status') || filters.availability_status || '');
  const [backgroundCheckFilter, setBackgroundCheckFilter] = useState(searchParams.get('type') || filters.background_check_status || '');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page') || '1'));
  const [currentLimit] = useState(Number(searchParams.get('limit') || String(pagination.limit || 20)));
  const [sortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder] = useState<'asc' | 'desc'>((searchParams.get('sort_order') as 'asc' | 'desc') || 'desc');
  const [showImportExport, setShowImportExport] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

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
      setAvailabilityFilter(value);
    } else if (filterId === 'background_check_status' && typeof value === 'string') {
      setBackgroundCheckFilter(value);
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
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedCount} volunteer(s)?`
      )
    ) {
      return;
    }

    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await dispatch(deleteVolunteer(id));
    }

    deselectAll();
    loadVolunteers();
  };

  const handleBulkExport = () => {
    const ids = Array.from(selectedIds);
    const selectedVolunteers = volunteers.filter((v) =>
      ids.includes(v.volunteer_id)
    );

    const columns = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'skills',
      'availability_status',
      'background_check_status',
      'total_hours_logged',
    ] as const;

    exportToCSV(
      selectedVolunteers.map((v) => ({
        first_name: v.first_name,
        last_name: v.last_name,
        email: v.email,
        phone: v.phone,
        skills: v.skills?.join('; ') || '',
        availability_status: v.availability_status,
        background_check_status: v.background_check_status,
        total_hours_logged: v.total_hours_logged,
      })),
      columns as any,
      {
        filename: 'volunteers-export',
        includeHeaders: true,
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
      unavailable: { bg: 'bg-red-100', text: 'text-red-800', label: 'Unavailable' },
      limited: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Limited' },
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
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      in_progress: { bg: 'bg-app-accent-soft', text: 'text-app-accent-text' },
      approved: { bg: 'bg-green-100', text: 'text-green-800' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800' },
      expired: { bg: 'bg-orange-100', text: 'text-orange-800' },
    };
    return statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-app-surface-muted',
      text: 'text-app-text',
    };
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      width: '280px',
      render: (_: any, row: Volunteer) => (
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
            onClick={() => {
              if (
                window.confirm(`Remove ${row.first_name} ${row.last_name}?`)
              ) {
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
        emptyStateTitle="No volunteers found"
        emptyStateDescription="Get started by adding your first volunteer"
        emptyStateAction={{
          label: 'Create First Volunteer',
          onClick: () => navigate('/volunteers/new'),
        }}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="volunteers"
        sampleData={volunteers}
      />
    </>
  );
};

export default VolunteerList;
