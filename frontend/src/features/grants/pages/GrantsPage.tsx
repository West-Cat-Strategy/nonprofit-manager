import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DangerButton,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SectionCard,
  SecondaryButton,
  SelectField,
  StatCard,
  TextareaField,
} from '../../../components/ui';
import { formatCurrency, formatDate, formatDateOnly, formatDateSmart } from '../../../utils/format';
import { useGrantsPageData } from '../hooks/useGrantsPageData';
import {
  GRANT_JURISDICTION_OPTIONS,
  SECTION_DEFINITIONS,
  STATUS_OPTIONS_BY_SECTION,
  getFieldDescriptors,
  getRowKey,
  getSectionColumns,
  sectionDescriptionById,
  sectionLabelById,
  sectionPrimaryActionLabelById,
  toOptions,
} from '../lib/grantsPageRegistry';
import type {
  EditableGrantRecord,
  FieldDescriptor,
  GrantsSectionId,
  GrantsTableRow,
  TableColumn,
} from '../lib/grantsPageTypes';

const formatMaybeDate = (value: string | null | undefined): string => (value ? formatDateOnly(value) : '—');

const renderTable = <T,>({
  title,
  subtitle,
  rows,
  columns,
  rowKey,
  emptyLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  rows: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string;
  emptyLabel: string;
  actions?: ReactNode;
}) => (
  <SectionCard title={title} subtitle={subtitle} actions={actions}>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-app-border-muted text-sm">
        <thead className="bg-app-surface-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted ${column.className ?? ''}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-app-border-muted bg-app-surface">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-app-text-muted" colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-app-hover/30">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-top text-app-text ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </SectionCard>
);

function SectionFormField({
  descriptor,
  value,
  onChange,
}: {
  descriptor: FieldDescriptor;
  value: string;
  onChange: (name: string, nextValue: string) => void;
}) {
  const commonProps = {
    id: descriptor.name,
    name: descriptor.name,
    required: descriptor.required,
    helperText: descriptor.helperText,
  };

  switch (descriptor.kind) {
    case 'number':
      return (
        <FormField
          {...commonProps}
          type="number"
          step={descriptor.step ?? '0.01'}
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
    case 'date':
      return (
        <FormField
          {...commonProps}
          type="date"
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
    case 'textarea':
      return (
        <TextareaField
          {...commonProps}
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
    case 'select':
      return (
        <SelectField
          {...commonProps}
          label={descriptor.label}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        >
          {descriptor.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      );
    case 'text':
    default:
      return (
        <FormField
          {...commonProps}
          type="text"
          label={descriptor.label}
          placeholder={descriptor.placeholder}
          value={value}
          onChange={(event) => onChange(descriptor.name, event.target.value)}
        />
      );
  }
}

export default function GrantsPage() {
  const navigate = useNavigate();
  const {
    activeSection,
    dueAfterFilter,
    dueBeforeFilter,
    error,
    exporting,
    fiscalYearFilter,
    formValues,
    funderFilter,
    fundedProgramFilter,
    handleAwardApplication,
    handleDeleteRecord,
    handleExport,
    handleFormChange,
    handleNewRecord,
    handleSelectRecord,
    handleSubmit,
    hasActiveFilters,
    jurisdictionFilter,
    limit,
    loading,
    lookups,
    maxAmountFilter,
    minAmountFilter,
    notice,
    pagination,
    programFilter,
    recipientFilter,
    refreshData,
    rows,
    saving,
    searchInput,
    selectedId,
    setPage,
    setPageSize,
    statusFilter,
    summary,
    updateFilter,
    updateStatus,
    clearFilters,
  } = useGrantsPageData();

  const actionButtons = (
    <>
      <SecondaryButton onClick={() => void handleExport('csv')} disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export CSV'}
      </SecondaryButton>
      <SecondaryButton onClick={() => void handleExport('xlsx')} disabled={exporting}>
        Export Excel
      </SecondaryButton>
      <SecondaryButton onClick={() => refreshData()} disabled={loading || exporting}>
        Refresh
      </SecondaryButton>
      <PrimaryButton
        onClick={activeSection === 'calendar' || activeSection === 'activities' ? refreshData : handleNewRecord}
        disabled={saving || loading}
      >
        {sectionPrimaryActionLabelById(activeSection)}
      </PrimaryButton>
    </>
  );

  const sectionFieldDescriptors = getFieldDescriptors(activeSection, lookups);
  const sectionColumns = getSectionColumns(activeSection, lookups, {
    onSelect: handleSelectRecord,
    onDelete: handleDeleteRecord,
    onStatusChange: updateStatus,
    onAwardApplication: handleAwardApplication,
  });

  const currentPaginationText = pagination
    ? `Page ${pagination.page} of ${pagination.total_pages} • ${pagination.total} records`
    : null;

  const summaryCards = summary
    ? [
        { label: 'Funders', value: summary.total_funders },
        { label: 'Programs', value: summary.total_programs },
        { label: 'Recipients', value: summary.total_recipients },
        { label: 'Funded Programs', value: summary.total_funded_programs },
        { label: 'Applications', value: summary.total_applications },
        { label: 'Awards', value: summary.total_awards },
        { label: 'Disbursed', value: formatCurrency(summary.total_disbursed_amount) },
        { label: 'Outstanding', value: formatCurrency(summary.outstanding_amount) },
      ]
    : [];

  const visibleRows = rows as GrantsTableRow[];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Grants"
        description="Internal tracking for federal and provincial grants by funder, program, recipient, award, disbursement, and reporting status."
        actions={actionButtons}
      />

      {notice && (
        <div className="rounded-[var(--ui-radius-sm)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={() => refreshData()} retryLabel="Reload grants" />}
      {loading && visibleRows.length === 0 ? <LoadingState label="Loading grants..." /> : null}

      {summaryCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} />
          ))}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Status Mix" subtitle="Grants and applications by current status.">
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.by_status.map((item) => (
                <div key={item.status} className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{item.status}</p>
                  <p className="mt-1 text-lg font-semibold text-app-text">{item.count}</p>
                  <p className="text-sm text-app-text-muted">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Jurisdiction Mix" subtitle="Federal and provincial portfolio distribution.">
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.by_jurisdiction.map((item) => (
                <div key={item.status} className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">{item.status}</p>
                  <p className="mt-1 text-lg font-semibold text-app-text">{item.count}</p>
                  <p className="text-sm text-app-text-muted">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard title="Sections" subtitle="Switch between grant workspaces, reporting, and portfolio views.">
        <div className="flex flex-wrap gap-2">
          {SECTION_DEFINITIONS.map((definition) => {
            const isActive = definition.id === activeSection;
            return (
              <button
                key={definition.id}
                type="button"
                onClick={() => navigate(definition.path)}
                className={`rounded-[var(--ui-radius-sm)] border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                    : 'border-app-border bg-app-surface text-app-text hover:bg-app-hover'
                }`}
              >
                {definition.label}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title={`${sectionLabelById(activeSection)} filters`}
        subtitle={sectionDescriptionById(activeSection)}
        actions={
          <SecondaryButton onClick={clearFilters} disabled={!hasActiveFilters}>
            Clear filters
          </SecondaryButton>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Search"
            value={searchInput}
            onChange={(event) => updateFilter('searchInput', event.target.value)}
            placeholder="Search grants, funders, programs..."
          />
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(event) => updateFilter('statusFilter', event.target.value)}
          >
            {STATUS_OPTIONS_BY_SECTION[activeSection].map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Jurisdiction"
            value={jurisdictionFilter}
            onChange={(event) => updateFilter('jurisdictionFilter', event.target.value)}
          >
            {GRANT_JURISDICTION_OPTIONS.map((option) => (
              <option key={option.value || option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <FormField
            label="Fiscal Year"
            value={fiscalYearFilter}
            onChange={(event) => updateFilter('fiscalYearFilter', event.target.value)}
            placeholder="2025"
          />
          <SelectField
            label="Funder"
            value={funderFilter}
            onChange={(event) => updateFilter('funderFilter', event.target.value)}
          >
            <option value="">All funders</option>
            {toOptions(lookups.funders, (item) => item.id, (item) => item.name).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Program"
            value={programFilter}
            onChange={(event) => updateFilter('programFilter', event.target.value)}
          >
            <option value="">All programs</option>
            {toOptions(lookups.programs, (item) => item.id, (item) => `${item.name}${item.funder_name ? ` • ${item.funder_name}` : ''}`).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Recipient"
            value={recipientFilter}
            onChange={(event) => updateFilter('recipientFilter', event.target.value)}
          >
            <option value="">All recipients</option>
            {toOptions(lookups.recipients, (item) => item.id, (item) => item.name).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Funded Program"
            value={fundedProgramFilter}
            onChange={(event) => updateFilter('fundedProgramFilter', event.target.value)}
          >
            <option value="">All funded programs</option>
            {toOptions(lookups.fundedPrograms, (item) => item.id, (item) => item.name).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <FormField
            label="Due After"
            type="date"
            value={dueAfterFilter}
            onChange={(event) => updateFilter('dueAfterFilter', event.target.value)}
          />
          <FormField
            label="Due Before"
            type="date"
            value={dueBeforeFilter}
            onChange={(event) => updateFilter('dueBeforeFilter', event.target.value)}
          />
          <FormField
            label="Minimum Amount"
            type="number"
            min="0"
            step="0.01"
            value={minAmountFilter}
            onChange={(event) => updateFilter('minAmountFilter', event.target.value)}
            placeholder="0.00"
          />
          <FormField
            label="Maximum Amount"
            type="number"
            min="0"
            step="0.01"
            value={maxAmountFilter}
            onChange={(event) => updateFilter('maxAmountFilter', event.target.value)}
            placeholder="0.00"
          />
          <SelectField
            label="Page Size"
            value={String(limit)}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </SelectField>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
        {renderSectionTable(activeSection, rows, sectionColumns, pagination, currentPaginationText, {
          onPageChange: setPage,
          onRefresh: refreshData,
          loading,
          saving,
        })}
        {activeSection === 'calendar' || activeSection === 'activities' ? (
          <SectionCard
            title={`${sectionLabelById(activeSection)} overview`}
            subtitle="These sections are read-only views of upcoming deadlines and recent activity."
          >
            {summary ? (
              <div className="space-y-3">
                <p className="text-sm text-app-text-muted">
                  Upcoming reports: {summary.upcoming_reports} • Upcoming disbursements: {summary.upcoming_disbursements}
                </p>
                <p className="text-sm text-app-text-muted">Overdue reports: {summary.overdue_reports}</p>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => navigate('/grants/reports')}>Open reports</SecondaryButton>
                  <SecondaryButton onClick={() => navigate('/grants/awards')}>Open awards</SecondaryButton>
                </div>
              </div>
            ) : (
              <LoadingState label="Loading overview..." />
            )}
          </SectionCard>
        ) : (
          <SectionCard
            title={selectedId ? `Edit ${sectionLabelById(activeSection)}` : `Create ${sectionLabelById(activeSection)}`}
            subtitle="Save changes directly from this internal staff-only workspace."
          >
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid gap-4 md:grid-cols-2">
                {sectionFieldDescriptors.map((descriptor) => (
                  <div key={descriptor.name} className={descriptor.colSpan ?? ''}>
                    <SectionFormField
                      descriptor={descriptor}
                      value={formValues[descriptor.name] ?? ''}
                      onChange={handleFormChange}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="submit" disabled={saving}>
                  {saving ? 'Saving...' : selectedId ? 'Save changes' : 'Create record'}
                </PrimaryButton>
                {selectedId && (
                  <>
                    <SecondaryButton type="button" onClick={handleNewRecord}>
                      New record
                    </SecondaryButton>
                    <DangerButton type="button" onClick={() => void handleDeleteRecord()} disabled={saving}>
                      Delete
                    </DangerButton>
                  </>
                )}
              </div>
            </form>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-app-text-muted">
                Quick references
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3 text-sm text-app-text-muted">
                  {lookups.funders.length} funders loaded
                </div>
                <div className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3 text-sm text-app-text-muted">
                  {lookups.programs.length} programs loaded
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Upcoming items" subtitle="Deadlines and due dates pulled from the grant calendar.">
            <div className="space-y-3">
              {summary.upcoming_items.length === 0 ? (
                <EmptyState
                  title="No upcoming items"
                  description="This portfolio does not have calendar items inside the current window."
                />
              ) : (
                summary.upcoming_items.slice(0, 6).map((item) => (
                  <div
                    key={`${item.item_type}-${item.id}`}
                    className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-app-text">{item.grant_number}</p>
                        <p className="text-sm text-app-text-muted">{item.grant_title}</p>
                        <p className="text-xs uppercase tracking-wide text-app-text-subtle">{item.item_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-app-text">{formatDateSmart(item.due_at)}</p>
                        <p className="text-xs text-app-text-muted">{formatMaybeDate(item.due_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Recent activity" subtitle="Latest audit entries across the grants workspace.">
            <div className="space-y-3">
              {summary.recent_activity.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Activity will appear after staff create or update grants."
                />
              ) : (
                summary.recent_activity.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-app-text">{item.action}</p>
                        <p className="text-sm text-app-text-muted">{item.entity_type}</p>
                        <p className="text-sm text-app-text-muted">{item.notes ?? 'No notes provided.'}</p>
                      </div>
                      <p className="text-xs text-app-text-muted">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function renderSectionTable(
  section: GrantsSectionId,
  rows: Array<EditableGrantRecord | GrantsTableRow>,
  columns: TableColumn<GrantsTableRow>[],
  pagination: { page: number; total_pages: number } | null,
  paginationLabel: string | null,
  controls: {
    onPageChange: (page: number) => void;
    onRefresh: () => void;
    loading: boolean;
    saving: boolean;
  }
) {
  const title = `${sectionLabelById(section)} records`;
  const subtitle = paginationLabel ?? sectionDescriptionById(section);

  return renderTable({
    title,
    subtitle,
    rows: rows as GrantsTableRow[],
    columns,
    rowKey: (row) => getRowKey(section, row),
    emptyLabel: 'No records match the current filters.',
    actions: pagination ? (
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={controls.onRefresh} disabled={controls.loading || controls.saving}>
          Refresh
        </SecondaryButton>
        <SecondaryButton
          onClick={() => controls.onPageChange(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
        >
          Previous
        </SecondaryButton>
        <SecondaryButton
          onClick={() => controls.onPageChange(Math.min(pagination.total_pages, pagination.page + 1))}
          disabled={pagination.page >= pagination.total_pages}
        >
          Next
        </SecondaryButton>
      </div>
    ) : undefined,
  });
}
