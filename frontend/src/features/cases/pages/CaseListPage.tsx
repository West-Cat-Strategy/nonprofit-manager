import { BrutalButton, BrutalCard, BrutalInput, NeoBrutalistLayout } from '../../../components/neo-brutalist';
import CaseListFiltersBar from '../components/CaseListFiltersBar';
import { CASE_PRIORITY_OPTIONS } from '../utils/casePriority';
import {
  DesktopCaseRow,
  MobileCaseCard,
} from '../components/CaseListResults';
import type { CasePriority, CaseStatus, CaseType, CaseWithDetails } from '../../../types/case';
import { useCaseListPage } from '../hooks/useCaseListPage';

type QuickFilter = 'all' | 'active' | 'overdue' | 'due_soon' | 'unassigned' | 'urgent';

const CaseList = () => {
  const {
    cases,
    visibleCases,
    total,
    loading,
    error,
    filters,
    selectedCaseIds,
    summary,
    caseTypes,
    caseStatuses,
    searchTerm,
    setSearchTerm,
    selectedPriority,
    setSelectedPriority,
    selectedStatus,
    setSelectedStatus,
    selectedType,
    setSelectedType,
    showUrgentOnly,
    setShowUrgentOnly,
    showImportedOnly,
    setShowImportedOnly,
    selectedSort,
    setSelectedSort,
    selectedOrder,
    setSelectedOrder,
    quickFilter,
    dueSoonDays,
    savedViews,
    selectedViewId,
    savedViewName,
    setSavedViewName,
    showBulkModal,
    setShowBulkModal,
    bulkStatusId,
    setBulkStatusId,
    bulkNotes,
    setBulkNotes,
    activeFilterChips,
    handleRemoveFilterChip,
    caseDisplayMetaById,
    handleToggleSelection,
    handleNavigateCase,
    handleEditCase,
    handleNavigateNewCase,
    handleClearSelection,
    handleSelectAllCases,
    handleBulkStatusUpdate,
    paginationPages,
    currentPage,
    totalPages,
    activeFiltersCount,
    hasActiveFilters,
    applyFilters,
    handleSearch,
    handleClearFilters,
    handlePageChange,
    handleLimitChange,
    applySavedView,
    handleSaveView,
    handleDeleteView,
    showSuccess,
    showError,
  } = useCaseListPage();

  return (
    <NeoBrutalistLayout pageTitle="Cases">
      <div className="p-6 space-y-6">
        <BrutalCard color="yellow" className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div style={{ color: 'var(--app-brutal-ink)' }}>
              <h1
                className="text-3xl font-black uppercase tracking-tight text-app-brutal-ink"
                style={{ color: 'var(--app-brutal-ink)' }}
              >
                Cases
              </h1>
              <p className="mt-1 font-bold text-app-brutal-ink" style={{ color: 'var(--app-brutal-ink)' }}>
                {total} {total === 1 ? 'case' : 'cases'} found
              </p>
            </div>
            <BrutalButton onClick={handleNavigateNewCase} variant="primary">
              + New Case
            </BrutalButton>
          </div>
          {summary && (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="border-2 border-app-border bg-app-surface-elevated px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
                <div className="text-xs font-black uppercase text-app-text-subtle">Open</div>
                <div className="text-2xl font-black text-app-text-heading">{summary.open_cases}</div>
              </div>
              <div className="border-2 border-app-border bg-app-surface-elevated px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
                <div className="text-xs font-black uppercase text-app-text-subtle">Urgent</div>
                <div className="text-2xl font-black text-app-accent">{summary.by_priority.urgent}</div>
              </div>
              <div className={`border-2 border-app-border px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)] ${summary.overdue_cases > 0 ? 'bg-app-accent-soft' : 'bg-app-surface-elevated'}`}>
                <div className="text-xs font-black uppercase text-app-text-subtle">Overdue</div>
                <div className={`text-2xl font-black ${summary.overdue_cases > 0 ? 'text-app-accent-text' : 'text-app-text-heading'}`}>{summary.overdue_cases}</div>
              </div>
              <div className="border-2 border-app-border bg-app-surface-elevated px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
                <div className="text-xs font-black uppercase text-app-text-subtle">Due This Week</div>
                <div className="text-2xl font-black text-app-text-heading">{summary.cases_due_this_week}</div>
              </div>
              <div className="border-2 border-app-border bg-app-surface-elevated px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]">
                <div className="text-xs font-black uppercase text-app-text-subtle">Unassigned</div>
                <div className="text-2xl font-black text-app-text-heading">{summary.unassigned_cases}</div>
              </div>
            </div>
          )}
        </BrutalCard>

        <BrutalCard color="white" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <BrutalInput
                type="text"
                placeholder="Search by case number, title, or description..."
                value={searchTerm}
                aria-label="Search cases"
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
            </div>

            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border-2 border-app-border bg-app-surface-elevated px-4 py-2 text-app-text-heading transition-all focus:outline-none focus:ring-2 focus:ring-app-accent"
                aria-label="Filter cases by type"
              >
                <option value="">All Types</option>
                {caseTypes.map((type: CaseType) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border-2 border-app-border bg-app-surface-elevated px-4 py-2 text-app-text-heading transition-all focus:outline-none focus:ring-2 focus:ring-app-accent"
                aria-label="Filter cases by status"
              >
                <option value="">All Statuses</option>
                {caseStatuses.map((status: CaseStatus) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as CasePriority | '')}
                className="w-full border-2 border-app-border bg-app-surface-elevated px-4 py-2 text-app-text-heading transition-all focus:outline-none focus:ring-2 focus:ring-app-accent"
                aria-label="Filter cases by priority"
              >
                <option value="">All Priorities</option>
                {CASE_PRIORITY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase text-app-text-subtle">Sort by</span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="w-full border-2 border-app-border bg-app-surface-elevated px-4 py-2 text-app-text-heading transition-all focus:outline-none focus:ring-2 focus:ring-app-accent"
                aria-label="Sort cases by field"
              >
                <option value="created_at">Created date</option>
                <option value="due_date">Due date</option>
                <option value="priority">Priority</option>
                <option value="case_number">Case number</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase text-app-text-subtle">Order</span>
              <select
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value as 'asc' | 'desc')}
                className="w-full border-2 border-app-border bg-app-surface-elevated px-4 py-2 text-app-text-heading transition-all focus:outline-none focus:ring-2 focus:ring-app-accent"
                aria-label="Sort cases by order"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase text-app-text-subtle">Saved views</span>
              <div className="flex gap-2">
                <select
                  value={selectedViewId}
                  onChange={(e) => applySavedView(e.target.value)}
                  className="flex-1 border-2 border-app-border bg-app-surface-elevated px-4 py-2 text-app-text-heading transition-all focus:outline-none focus:ring-2 focus:ring-app-accent"
                  aria-label="Saved case views"
                >
                  <option value="">Select view</option>
                  {savedViews.map((view) => (
                    <option key={view.id} value={view.id}>
                      {view.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDeleteView}
                  className="border-2 border-app-border bg-app-surface-elevated px-3 py-2 text-xs font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--shadow-color)] hover:bg-app-surface-muted"
                  disabled={!selectedViewId}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase text-app-text-subtle">Quick filters</span>
            {(
              [
                ['all', 'All'],
                ['active', 'Active'],
                ['overdue', 'Overdue'],
                ['due_soon', 'Due soon'],
                ['unassigned', 'Unassigned'],
                ['urgent', 'Urgent'],
              ] as Array<[QuickFilter, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  applyFilters({
                    quickFilter: value,
                    dueSoonDays,
                    page: 1,
                  });
                }}
                className="border-2 border-app-border px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-all"
                style={{
                  backgroundColor:
                    quickFilter === value ? '#ffeb3b' : '#ffffff',
                  color: '#000000',
                  borderColor: '#000000',
                }}
              >
                {label}
              </button>
            ))}
            {quickFilter === 'due_soon' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-app-text-subtle">Days</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={dueSoonDays}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    const nextValue = Number.isNaN(value) ? 7 : Math.max(1, Math.min(60, value));
                    applyFilters({
                      quickFilter: 'due_soon',
                      dueSoonDays: nextValue,
                      page: 1,
                    });
                  }}
                  className="w-20 border-2 border-app-border bg-app-surface-elevated px-2 py-1 text-xs font-black uppercase text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent"
                  aria-label="Days until cases are due soon"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showUrgentOnly}
                onChange={(e) => setShowUrgentOnly(e.target.checked)}
                className="app-contrast-checkbox"
                aria-label="Show urgent cases only"
              />
              <span className="text-sm font-bold uppercase text-app-text-heading">
                Urgent only
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showImportedOnly}
                onChange={(e) => setShowImportedOnly(e.target.checked)}
                className="app-contrast-checkbox"
                aria-label="Show imported cases only"
              />
              <span className="text-sm font-bold uppercase text-app-text-heading">
                Imported only
              </span>
            </label>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <BrutalInput
                type="text"
                placeholder="Save current view"
                value={savedViewName}
                aria-label="Saved view name"
                onChange={(e) => setSavedViewName(e.target.value)}
              />
              <BrutalButton onClick={handleSaveView} variant="secondary" size="sm">
                Save View
              </BrutalButton>
            </div>
            <BrutalButton
              onClick={async () => {
                try {
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(window.location.href);
                    showSuccess('Link copied to clipboard');
                    return;
                  }
                  const fallbackInput = document.createElement('textarea');
                  fallbackInput.value = window.location.href;
                  fallbackInput.style.position = 'fixed';
                  fallbackInput.style.opacity = '0';
                  document.body.appendChild(fallbackInput);
                  fallbackInput.focus();
                  fallbackInput.select();
                  const success = document.execCommand('copy');
                  document.body.removeChild(fallbackInput);
                  if (success) {
                    showSuccess('Link copied to clipboard');
                  } else {
                    showError('Failed to copy link');
                  }
                } catch {
                  showError('Failed to copy link');
                }
              }}
              variant="secondary"
              size="sm"
            >
              Copy Link
            </BrutalButton>
            {hasActiveFilters && (
              <span className="text-xs font-black uppercase text-app-text-subtle">
                {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} applied
              </span>
            )}
            <BrutalButton onClick={handleClearFilters} variant="secondary" size="sm">
              Clear Filters
            </BrutalButton>
            <BrutalButton onClick={handleSearch} variant="primary" size="sm">
              Apply Filters
            </BrutalButton>
          </div>

          <CaseListFiltersBar chips={activeFilterChips} onRemove={handleRemoveFilterChip} onClearAll={handleClearFilters} />
        </BrutalCard>
        {error && (
          <div className="border-2 border-app-border bg-app-accent-soft p-4 font-bold text-app-accent-text shadow-[6px_6px_0px_var(--shadow-color)]">
            {error}
          </div>
        )}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-black dark:border-white border-t-transparent"></div>
          </div>
        )}
        {selectedCaseIds.length > 0 && (
          <BrutalCard color="purple" className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black uppercase text-app-brutal-ink">
                  {selectedCaseIds.length} case{selectedCaseIds.length === 1 ? '' : 's'} selected
                </span>
                <BrutalButton onClick={handleClearSelection} variant="secondary" size="sm">
                  Clear
                </BrutalButton>
              </div>
              <div className="flex items-center gap-2">
                <BrutalButton onClick={() => setShowBulkModal(true)} variant="primary" size="sm">
                  Bulk Status Change
                </BrutalButton>
              </div>
            </div>
          </BrutalCard>
        )}
        {showBulkModal && (
          <div className="fixed inset-0 app-popup-backdrop flex items-center justify-center z-50" role="dialog" aria-modal="true">
            <BrutalCard color="white" className="p-6 max-w-md w-full mx-4">
              <h3 className="mb-4 text-lg font-black uppercase text-app-text-heading">
                Bulk Status Update ({selectedCaseIds.length} cases)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-black uppercase text-app-text-subtle">New Status</label>
                  <select
                    value={bulkStatusId}
                    onChange={(e) => setBulkStatusId(e.target.value)}
                    className="w-full border-2 border-app-border bg-app-surface-elevated px-3 py-2 text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent"
                    aria-label="Bulk status"
                  >
                    <option value="">Select status...</option>
                    {caseStatuses.map((status: CaseStatus) => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-black uppercase text-app-text-subtle">Notes</label>
                  <textarea
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    rows={3}
                    placeholder="Reason for bulk status change..."
                    className="w-full border-2 border-app-border bg-app-surface-elevated px-3 py-2 text-app-text-heading focus:outline-none focus:ring-2 focus:ring-app-accent"
                    aria-label="Bulk status notes"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <BrutalButton onClick={() => { setShowBulkModal(false); setBulkStatusId(''); setBulkNotes(''); }} variant="secondary">
                    Cancel
                  </BrutalButton>
                  <BrutalButton onClick={handleBulkStatusUpdate} disabled={!bulkStatusId || loading} variant="primary">
                    {loading ? 'Updating...' : 'Update All'}
                  </BrutalButton>
                </div>
              </div>
            </BrutalCard>
          </div>
        )}

        {!loading && visibleCases.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {visibleCases.map((caseItem: CaseWithDetails) => {
                const caseMeta = caseDisplayMetaById.get(caseItem.id);
                if (!caseMeta) return null;
                return (
                  <MobileCaseCard
                    key={caseItem.id}
                    caseItem={caseItem}
                    caseMeta={caseMeta}
                    isSelected={selectedCaseIds.includes(caseItem.id)}
                    onToggleSelection={handleToggleSelection}
                    onNavigateCase={handleNavigateCase}
                    onEditCase={handleEditCase}
                  />
                );
              })}
            </div>

            <BrutalCard color="white" className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="border-b-2 border-app-border bg-[var(--loop-cyan)]">
                    <tr>
                      <th className="px-4 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedCaseIds.length === visibleCases.length && visibleCases.length > 0}
                          onChange={() =>
                            selectedCaseIds.length === visibleCases.length
                              ? handleClearSelection()
                              : handleSelectAllCases()
                          }
                          className="app-contrast-checkbox"
                          aria-label="Select all visible cases"
                        />
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Case #
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Title
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Client
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Type
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Status
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Priority
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Assigned
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Due Date
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Age
                      </th>
                      <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider text-app-brutal-ink">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-app-surface">
                    {visibleCases.map((caseItem: CaseWithDetails) => {
                      const caseMeta = caseDisplayMetaById.get(caseItem.id);
                      if (!caseMeta) return null;
                      return (
                        <DesktopCaseRow
                          key={caseItem.id}
                          caseItem={caseItem}
                          caseMeta={caseMeta}
                          isSelected={selectedCaseIds.includes(caseItem.id)}
                          onToggleSelection={handleToggleSelection}
                          onNavigateCase={handleNavigateCase}
                          onEditCase={handleEditCase}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </BrutalCard>
          </>
        )}

        {!loading && visibleCases.length === 0 && (
          <BrutalCard color="white" className="p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="mb-2 text-xl font-black uppercase text-app-text-heading">No cases found</h3>
            <p className="mb-6 font-bold text-app-text-subtle">
              {filters.search || filters.priority || filters.status_id
                ? 'Try adjusting your filters'
                : 'Get started by creating your first case'}
            </p>
            <div className="flex justify-center">
              <BrutalButton onClick={handleNavigateNewCase} variant="primary">
                Create First Case
              </BrutalButton>
            </div>
          </BrutalCard>
        )}

        {!loading && cases.length > 0 && totalPages > 1 && (
          <>
            <div className="mt-6 flex flex-col gap-3 md:hidden">
              <p className="text-sm font-bold text-app-text-heading">
                Page {currentPage} of {totalPages} · {total} cases
              </p>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex-1 border-2 border-app-border bg-app-surface-elevated px-4 py-2 font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex-1 border-2 border-app-border bg-app-surface-elevated px-4 py-2 font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="mt-6 hidden items-center justify-between md:flex">
              <div className="flex items-center gap-4 text-sm font-bold text-app-text-heading">
                Showing {(currentPage - 1) * (filters.limit || 20) + 1} to{' '}
                {Math.min(currentPage * (filters.limit || 20), total)} of {total} cases
                <label className="inline-flex items-center gap-2 text-xs font-black uppercase text-app-text-subtle">
                  Rows
                  <select
                    value={filters.limit || 20}
                    onChange={(event) => {
                      const nextLimit = Number(event.target.value);
                      handleLimitChange(nextLimit);
                    }}
                    className="border-2 border-app-border bg-app-surface-elevated px-2 py-1 text-xs font-black uppercase text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                    aria-label="Cases per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-2 border-app-border bg-app-surface-elevated px-4 py-2 font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)] transition-colors hover:bg-[var(--loop-yellow)] hover:text-app-brutal-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-app-surface-elevated"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {paginationPages[0] !== 1 && (
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        className="border-2 border-app-border bg-app-surface-elevated px-4 py-2 font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)] transition-colors hover:bg-[var(--loop-yellow)] hover:text-app-brutal-ink"
                      >
                        1
                      </button>
                      <span className="text-sm font-black text-app-text-subtle">…</span>
                    </>
                  )}
                  {paginationPages.map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`border-2 border-app-border px-4 py-2 font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] transition-colors ${
                        currentPage === page
                          ? 'bg-app-text-heading text-app-bg'
                          : 'bg-app-surface-elevated text-app-text-heading hover:bg-[var(--loop-yellow)] hover:text-app-brutal-ink'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  {paginationPages[paginationPages.length - 1] !== totalPages && (
                    <>
                      <span className="text-sm font-black text-app-text-subtle">…</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="border-2 border-app-border bg-app-surface-elevated px-4 py-2 font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)] transition-colors hover:bg-[var(--loop-yellow)] hover:text-app-brutal-ink"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-2 border-app-border bg-app-surface-elevated px-4 py-2 font-black uppercase text-app-text-heading shadow-[2px_2px_0px_var(--shadow-color)] transition-colors hover:bg-[var(--loop-yellow)] hover:text-app-brutal-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-app-surface-elevated"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </NeoBrutalistLayout>
  );
};

export default CaseList;
