/**
 * Enhanced Volunteer List Page
 * Example of using the refactored PeopleListContainer with bulk operations,
 * advanced filtering, and import/export
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';



const VolunteerListEnhanced = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { volunteers, loading, error, pagination, filters } = useAppSelector(
    (state) => state.volunteers
  );
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const {
    selectedIds,
    selectedCount,
    toggleRow,
    selectAll,
    deselectAll,
    getSelected,
  } = useBulkSelect();

  const { exportToCSV } = useImportExport();
  const [searchInput, setSearchInput] = useState(filters.search);
  const [availabilityFilter, setAvailabilityFilter] = useState(
    filters.availability_status
  );
  const [backgroundCheckFilter, setBackgroundCheckFilter] = useState(
    filters.background_check_status
  );
  const [showImportExport, setShowImportExport] = useState(false);
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  const loadVolunteers = useCallback(() => {
    dispatch(
      fetchVolunteers({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        availability_status: filters.availability_status || undefined,
        background_check_status: filters.background_check_status || undefined,
      })
    );
  }, [dispatch, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

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
    dispatch(clearFilters());
  };

  const handleSelectAll = () => {
    if (selectedCount === volunteers.length) {
      deselectAll();
    } else {
      selectAll(volunteers.map((v) => v.volunteer_id));
    }
  };

  const handleSelectRow = (volunteerId: string) => {
    toggleRow(volunteerId);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Volunteers',
      message: `Are you sure you want to delete ${selectedCount} volunteer(s)?`,
      confirmLabel: 'Delete Volunteers',
      variant: 'danger',
    });
    if (!confirmed) return;

    const ids = getSelected();
    for (const id of ids) {
      await dispatch(deleteVolunteer(id));
    }

    deselectAll();
    loadVolunteers();
  };

  const handleDeleteVolunteer = async (row: Volunteer) => {
    const confirmed = await confirm(confirmPresets.delete(`${row.first_name} ${row.last_name}`));
    if (!confirmed) return;
    await dispatch(deleteVolunteer(row.volunteer_id));
    loadVolunteers();
  };

  const handleBulkExport = () => {
    const ids = getSelected();
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
      columns,
      {
        filename: 'volunteers-export',
        includeHeaders: true,
      }
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { bg: 'bg-green-100', text: 'text-green-800' },
      unavailable: { bg: 'bg-red-100', text: 'text-red-800' },
      limited: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] || {
        bg: 'bg-app-surface-muted',
        text: 'text-app-text',
      };
    return config;
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
    const config =
      statusConfig[status as keyof typeof statusConfig] || {
        bg: 'bg-app-surface-muted',
        text: 'text-app-text',
      };
    return config;
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      width: '250px',
      render: (_, row) => (
        <div>
          <p
            className="text-app-accent hover:text-app-accent-text font-medium cursor-pointer"
            onClick={() => navigate(`/volunteers/${row.volunteer_id}`)}
          >
            {row.first_name} {row.last_name}
          </p>
          <p className="text-sm text-app-text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'skills',
      label: 'Skills',
      width: '150px',
      render: (_, row: Volunteer) => (
        <div className="flex flex-wrap gap-1">
          {row.skills && row.skills.length > 0 ? (
            <>
              {row.skills.slice(0, 2).map((skill, idx) => (
                <BrutalBadge key={idx} color="blue">
                  {skill}
                </BrutalBadge>
              ))}
              {row.skills.length > 2 && (
                <span className="text-xs text-app-text-muted">
                  +{row.skills.length - 2} more
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-app-text-subtle">No skills</span>
          )}
        </div>
      ),
    },
    {
      key: 'availability_status',
      label: 'Availability',
      width: '120px',
      render: (value: string) => {
        const config = getStatusBadge(value);
        return (
          <span className={`px-3 py-1 text-xs rounded ${config.bg} ${config.text}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'background_check_status',
      label: 'Background Check',
      width: '150px',
      render: (value: string) => {
        const config = getBackgroundCheckBadge(value);
        return (
          <span className={`px-3 py-1 text-xs rounded ${config.bg} ${config.text}`}>
            {value.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'total_hours_logged',
      label: 'Hours',
      width: '80px',
      render: (value: number) => <span>{value || 0} hrs</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
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
              void handleDeleteVolunteer(row);
            }}
            className="px-2 py-1 border border-app-border rounded text-app-text text-xs font-mono hover:bg-app-accent-soft hover:text-app-accent-text transition"
          >
            Remove
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
        data={volunteers}
        columns={columns}
        pagination={{
          ...pagination,
          totalPages: pagination.total_pages,
        }}
        onPageChange={(page) =>
          dispatch(
            fetchVolunteers({
              page,
              limit: pagination.limit,
              search: filters.search || undefined,
              availability_status: filters.availability_status || undefined,
              background_check_status: filters.background_check_status || undefined,
            })
          )
        }
        selectedRows={selectedIds}
        onSelectRow={handleSelectRow}
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
          label: 'Create Volunteer',
          onClick: () => navigate('/volunteers/new'),
        }}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="volunteers"
        sampleData={volunteers}
        onExport={() => {
          const columns = ['first_name', 'last_name', 'email', 'phone', 'skills', 'availability_status'] as const;
          exportToCSV(
            volunteers.map((v) => ({
              first_name: v.first_name,
              last_name: v.last_name,
              email: v.email,
              phone: v.phone ?? '',
              skills: v.skills?.join('; ') ?? '',
              availability_status: v.availability_status,
            })),
            columns,
            {
            filename: 'volunteers',
            }
          );
        }}
      />
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
};

export default VolunteerListEnhanced;
