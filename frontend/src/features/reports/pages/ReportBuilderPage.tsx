import { useNavigate } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import FieldSelector from '../../../components/FieldSelector';
import FilterBuilder from '../../../components/FilterBuilder';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import ReportChart from '../../../components/ReportChart';
import SortBuilder from '../../../components/SortBuilder';
import {
  EmptyState,
  FormField,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SelectField,
  TextareaField,
} from '../../../components/ui';
import { useAppSelector } from '../../../store/hooks';
import { getReportAccess } from '../../auth/state/reportAccess';
import useReportBuilderController from '../hooks/useReportBuilderController';
import type { AggregateFunction, ReportEntity, ReportExportJob } from '../../../types/report';

const ENTITIES: { value: ReportEntity; label: string }[] = [
  { value: 'accounts', label: 'Accounts' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'donations', label: 'Donations' },
  { value: 'events', label: 'Events' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'follow_ups', label: 'Follow-ups' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'volunteers', label: 'Volunteers' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'cases', label: 'Cases' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'grants', label: 'Grants' },
  { value: 'programs', label: 'Programs' },
];
const statusStyles: Record<ReportExportJob['status'], string> = {
  pending: 'bg-app-surface-muted text-app-text-muted',
  processing: 'bg-app-accent-soft text-app-accent-text',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
};
const builderCardClass =
  'transition duration-200 hover:-translate-y-0.5 hover:border-app-border hover:shadow-md';

function ReportBuilder() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { canExportReports, canManageReports } = getReportAccess(user);
  const {
    aggregations,
    allOutputFields,
    availableFields,
    chartType,
    currentReport,
    downloadingJobId,
    entity,
    exportJobError,
    exportJobsLoading,
    fieldsLoading,
    filters,
    groupBy,
    loading,
    manualExportJobs,
    reportRows,
    rowLimit,
    savedReportDescription,
    savedReportName,
    selectedFields,
    showChart,
    showSaveDialog,
    sorts,
    xAxisField,
    yAxisField,
    setAggregations,
    setChartType,
    setFilters,
    setGroupBy,
    setRowLimit,
    setSavedReportDescription,
    setSavedReportName,
    setSelectedFields,
    setShowChart,
    setShowSaveDialog,
    setSorts,
    setXAxisField,
    setYAxisField,
    handleDownloadExportJob,
    handleEntityChange,
    handleExportPDF,
    handleGenerateReport,
    handleRetryExportJob,
    handleSaveReport,
    handleStartExport,
    resetSaveDialog,
  } = useReportBuilderController();

  return (
    <NeoBrutalistLayout pageTitle="REPORTS">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Report Builder"
          description="Build a report by choosing the records, columns, filters, and export format you need."
          actions={
            <>
              <SecondaryButton
                leadingIcon={<ClipboardDocumentListIcon className="h-4 w-4" aria-hidden="true" />}
                onClick={() => navigate('/reports/templates')}
              >
                KPI Templates
              </SecondaryButton>
              <SecondaryButton
                leadingIcon={<DocumentChartBarIcon className="h-4 w-4" aria-hidden="true" />}
                onClick={() => navigate('/reports/outcomes')}
              >
                Outcomes Report
              </SecondaryButton>
              <SecondaryButton
                leadingIcon={<ChartBarIcon className="h-4 w-4" aria-hidden="true" />}
                onClick={() => navigate('/reports/workflow-coverage')}
              >
                Workflow Coverage
              </SecondaryButton>
            </>
          }
        />

        <SectionCard
          className={builderCardClass}
          title="1. Choose records"
          subtitle="Pick the area this report should read from."
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ENTITIES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => handleEntityChange(entry.value)}
                className={`rounded-[var(--ui-radius-sm)] border px-3 py-2 text-sm font-semibold transition duration-150 hover:-translate-y-0.5 ${
                  entity === entry.value
                    ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                    : 'border-app-border bg-app-surface text-app-text hover:bg-app-hover'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard className={builderCardClass} title="2. Choose columns">
          <FieldSelector
            availableFields={availableFields}
            fieldsLoading={fieldsLoading}
            selectedFields={selectedFields}
            onChange={setSelectedFields}
          />
        </SectionCard>

        <SectionCard className={builderCardClass} title="3. Group rows (optional)">
          <div className="flex flex-wrap gap-2">
            {availableFields
              .filter((field) => field.type === 'string' || field.type === 'date')
              .map((field) => {
                const isActive = groupBy.includes(field.field);
                return (
                  <button
                    key={field.field}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setGroupBy(groupBy.filter((item) => item !== field.field));
                      } else {
                        setGroupBy([...groupBy, field.field]);
                      }
                    }}
                    className={`rounded-[var(--ui-radius-sm)] border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition duration-150 hover:-translate-y-0.5 ${
                      isActive
                        ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                        : 'border-app-border bg-app-surface text-app-text'
                    }`}
                  >
                    {field.label}
                  </button>
                );
              })}
          </div>
        </SectionCard>

        <SectionCard className={builderCardClass} title="4. Add totals (optional)">
          <div className="space-y-4">
            {availableFields
              .filter((field) => ['number', 'currency'].includes(field.type))
              .map((field) => (
                <div key={field.field} className="flex flex-wrap items-center gap-3">
                  <span className="w-28 text-sm font-semibold uppercase tracking-wide text-app-text-muted">
                    {field.label}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(['sum', 'avg', 'count', 'min', 'max'] as AggregateFunction[]).map((func) => {
                      const isActive = aggregations.some(
                        (item) => item.field === field.field && item.function === func
                      );
                      return (
                        <button
                          key={func}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setAggregations(
                                aggregations.filter(
                                  (item) => !(item.field === field.field && item.function === func)
                                )
                              );
                            } else {
                              setAggregations([
                                ...aggregations,
                                { field: field.field, function: func },
                              ]);
                            }
                          }}
                          className={`rounded-[var(--ui-radius-sm)] border px-3 py-1 text-xs font-semibold uppercase transition duration-150 hover:-translate-y-0.5 ${
                            isActive
                              ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                              : 'border-app-border bg-app-surface text-app-text'
                          }`}
                        >
                          {func}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>

        <SectionCard className={builderCardClass} title="5. Add filters (optional)">
          <FilterBuilder
            availableFields={availableFields}
            filters={filters}
            onChange={setFilters}
          />
        </SectionCard>

        <SectionCard className={builderCardClass} title="6. Sort results (optional)">
          <SortBuilder
            entity={entity}
            selectedFields={allOutputFields}
            sorts={sorts}
            onChange={setSorts}
          />
        </SectionCard>

        <SectionCard className={builderCardClass} title="7. Limit rows">
          <div className="max-w-xs">
            <FormField
              type="number"
              min={1}
              max={10000}
              label="Max rows to return (1-10000)"
              value={rowLimit}
              onChange={(event) => setRowLimit(event.target.value)}
            />
          </div>
        </SectionCard>

        <SectionCard className={builderCardClass} title="8. Run and export">
          <div className="flex flex-wrap gap-2">
            {canManageReports && (
              <>
                <PrimaryButton
                  leadingIcon={<ArrowPathIcon className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => void handleGenerateReport()}
                  disabled={loading || (selectedFields.length === 0 && aggregations.length === 0)}
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </PrimaryButton>

                <SecondaryButton
                  leadingIcon={<ClipboardDocumentListIcon className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setShowSaveDialog(true)}
                  disabled={selectedFields.length === 0 && aggregations.length === 0}
                >
                  Save Definition
                </SecondaryButton>
              </>
            )}

            {canExportReports && reportRows.length > 0 && (
              <>
                <SecondaryButton
                  leadingIcon={<ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => void handleStartExport('csv')}
                >
                  Export CSV
                </SecondaryButton>
                <SecondaryButton
                  leadingIcon={<TableCellsIcon className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => void handleStartExport('xlsx')}
                >
                  Export Excel
                </SecondaryButton>
                <SecondaryButton
                  leadingIcon={<DocumentChartBarIcon className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => void handleExportPDF()}
                >
                  Export PDF
                </SecondaryButton>
                <SecondaryButton
                  leadingIcon={<ChartBarIcon className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setShowChart((value) => !value)}
                >
                  {showChart ? 'Hide Chart' : 'Show Chart'}
                </SecondaryButton>
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="9. Recent Exports"
          subtitle="Manual CSV and Excel exports now run through shared export jobs so they can be retried and downloaded later."
        >
          {exportJobError && (
            <div className="rounded-[var(--ui-radius-sm)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {exportJobError}
            </div>
          )}

          {manualExportJobs.length === 0 ? (
            <div className="rounded-[var(--ui-radius-sm)] border border-dashed border-app-border px-4 py-6 text-sm text-app-text-muted">
              {exportJobsLoading ? 'Loading recent exports...' : 'No manual export jobs yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {manualExportJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-app-text">{job.name}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyles[job.status]}`}
                        >
                          {job.status}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-app-text-subtle">
                          {job.format}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-app-text-muted">
                        Created {new Date(job.createdAt).toLocaleString()}
                        {job.rowsCount !== null ? ` • ${job.rowsCount} rows` : ''}
                        {job.runtimeMs !== null ? ` • ${job.runtimeMs} ms` : ''}
                      </p>
                      {job.failureMessage && (
                        <p className="mt-2 text-sm text-rose-700">{job.failureMessage}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canExportReports && job.status === 'completed' && (
                        <SecondaryButton
                          onClick={() => void handleDownloadExportJob(job)}
                          disabled={downloadingJobId === job.id}
                        >
                          {downloadingJobId === job.id ? 'Downloading...' : 'Download'}
                        </SecondaryButton>
                      )}
                      {canExportReports && (
                        <SecondaryButton onClick={() => void handleRetryExportJob(job)}>
                          Retry Export
                        </SecondaryButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {showChart && reportRows.length > 0 && (
          <SectionCard title="Visualization Settings">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <SelectField
                label="Chart Type"
                value={chartType}
                onChange={(event) => setChartType(event.target.value as 'bar' | 'pie' | 'line')}
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
              </SelectField>

              <SelectField
                label="X-Axis (Label)"
                value={xAxisField}
                onChange={(event) => setXAxisField(event.target.value)}
              >
                <option value="">Select Field</option>
                {[...groupBy, ...selectedFields].map((field) => (
                  <option key={field} value={field}>
                    {field.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Y-Axis (Value)"
                value={yAxisField}
                onChange={(event) => setYAxisField(event.target.value)}
              >
                <option value="">Select Field</option>
                {[
                  ...selectedFields,
                  ...aggregations.map((item) => item.alias || `${item.function}_${item.field}`),
                ].map((field) => (
                  <option key={field} value={field}>
                    {field.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </SelectField>
            </div>

            {xAxisField && yAxisField && (
              <div className="mt-6">
                <ReportChart
                  data={reportRows}
                  chartType={chartType}
                  xAxisField={xAxisField}
                  yAxisField={yAxisField}
                  title={`${entity.toUpperCase()} VISUALIZATION`}
                />
              </div>
            )}
          </SectionCard>
        )}

        {reportRows.length > 0 && (
          <SectionCard
            title="Data Preview"
            subtitle={`Showing ${Math.min(reportRows.length, 50)} of ${reportRows.length} rows`}
          >
            <div className="overflow-x-auto rounded-[var(--ui-radius-sm)] border border-app-border-muted">
              <table className="min-w-full divide-y divide-app-border-muted bg-app-surface text-sm">
                <thead className="bg-app-surface-muted">
                  <tr>
                    {allOutputFields.map((field) => (
                      <th
                        key={field}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted"
                      >
                        {field.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border-muted">
                  {reportRows.slice(0, 50).map((row, index) => (
                    <tr key={index}>
                      {allOutputFields.map((field) => (
                        <td key={field} className="px-4 py-3 text-app-text">
                          {row[field] !== null && row[field] !== undefined
                            ? String(row[field])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportRows.length > 50 && (
              <p className="mt-3 text-xs text-app-text-muted">
                Export the report to view the full dataset.
              </p>
            )}
          </SectionCard>
        )}

        {currentReport && reportRows.length === 0 && (
          <EmptyState
            title="No data found"
            description="No rows matched your selected filters and output fields."
          />
        )}

        {showSaveDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop p-4">
            <div className="w-full max-w-lg rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface p-5 shadow-lg">
              <PageHeader
                title="Save Report Definition"
                description="Store this report configuration so it can be reused later."
              />

              <div className="mt-4 space-y-3">
                <FormField
                  required
                  label="Report Name"
                  value={savedReportName}
                  onChange={(event) => setSavedReportName(event.target.value)}
                  placeholder="e.g., Monthly Donor Report"
                />
                <TextareaField
                  label="Description (Optional)"
                  rows={3}
                  value={savedReportDescription}
                  onChange={(event) => setSavedReportDescription(event.target.value)}
                  placeholder="Describe what this report is for..."
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <SecondaryButton onClick={resetSaveDialog}>Cancel</SecondaryButton>
                <PrimaryButton onClick={() => void handleSaveReport()}>Save</PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </NeoBrutalistLayout>
  );
}

export default ReportBuilder;
