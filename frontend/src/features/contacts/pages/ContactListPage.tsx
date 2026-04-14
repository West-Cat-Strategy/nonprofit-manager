import { BulkActionBar, FilterPanel, ImportExportModal, PeopleListContainer } from '../../people';
import { SecondaryButton } from '../../../components/ui';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useContactListPage } from '../hooks/useContactListPage';

const ContactList = () => {
  const {
    contacts,
    loading,
    error,
    pagination,
    selectedIds,
    selectedCount,
    toggleRow,
    deselectAll,
    columns,
    renderContactCard,
    setFilterCollapsed,
    showImportExport,
    setShowImportExport,
    dialogState,
    handleConfirm,
    handleCancel,
    handleFilterChange,
    handleApplyFilters,
    handleClearFilters,
    handleSelectAll,
    handleBulkDelete,
    setCurrentPage,
    onCreateNew,
    openImportExport,
    exportRequest,
    onImportComplete,
    peopleFilters,
    hasActiveFilters,
  } = useContactListPage();

  return (
    <>
      <PeopleListContainer
        title="People"
        description="Manage all organizational contacts and relationships"
        getRowId={(row) => row.contact_id}
        headerActions={
          <SecondaryButton onClick={openImportExport}>
            Import / Export
          </SecondaryButton>
        }
        onCreateNew={onCreateNew}
        createButtonLabel="New Person"
        filters={
          <FilterPanel
            fields={peopleFilters.fields}
            onFilterChange={handleFilterChange}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            applyLabel="Search"
            isCollapsed={peopleFilters.isCollapsed}
            onToggleCollapse={() => setFilterCollapsed((current) => !current)}
            activeFilterCount={peopleFilters.activeFilterCount}
          />
        }
        loading={loading}
        error={error || undefined}
        data={contacts}
        columns={columns}
        mobileCardRenderer={renderContactCard}
        pagination={{
          total: pagination.total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: pagination.total_pages,
        }}
        onPageChange={setCurrentPage}
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
                  onClick: openImportExport,
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
          onClick: onCreateNew,
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

      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="contacts"
        selectedIds={Array.from(selectedIds)}
        exportRequest={exportRequest}
        onImportComplete={onImportComplete}
      />
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  );
};

export default ContactList;
