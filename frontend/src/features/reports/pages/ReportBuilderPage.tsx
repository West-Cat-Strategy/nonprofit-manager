import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { reportsApiClient } from '../api/reportsApiClient';
import { triggerFileDownload } from '../../../services/fileDownload';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  createReportExportJob,
  fetchReportExportJob,
  fetchReportExportJobs,
  generateReport,
} from '../state';
import { createSavedReport, fetchSavedReportById } from '../../savedReports/state';
import type {
  AggregateFunction,
  ReportAggregation,
  ReportDefinition,
  ReportEntity,
  ReportExportJob,
  ReportFilter,
  ReportSort,
} from '../../../types/report';

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

const EXPORT_POLL_INTERVAL_MS = 2000;

const createExportIdempotencyKey = (entity: ReportEntity, format: 'csv' | 'xlsx'): string => {
  const suffix =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `report-builder:${entity}:${format}:${suffix}`;
};

const getExportFallbackFilename = (job: ReportExportJob): string =>
  job.artifactFileName || `${job.entity}_report_${new Date().toISOString().split('T')[0]}.${job.format}`;

const statusStyles: Record<ReportExportJob['status'], string> = {
  pending: 'bg-app-surface-muted text-app-text-muted',
  processing: 'bg-app-accent-soft text-app-accent-text',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-rose-100 text-rose-800',
};

function ReportBuilder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    currentReport,
    loading,
    availableFields,
    exportJobs,
    exportJobsLoading,
    activeExportJobId,
    exportJobError,
  } = useAppSelector((state) => state.reports);
  const reportRows = currentReport?.data ?? [];
  const { currentSavedReport } = useAppSelector((state) => state.savedReports);

  const [entity, setEntity] = useState<ReportEntity>('contacts');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sorts, setSorts] = useState<ReportSort[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [aggregations, setAggregations] = useState<ReportAggregation[]>([]);
  const [rowLimit, setRowLimit] = useState('500');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedReportName, setSavedReportName] = useState('');
  const [savedReportDescription, setSavedReportDescription] = useState('');

  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');
  const [xAxisField, setXAxisField] = useState('');
  const [yAxisField, setYAxisField] = useState('');
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [autoDownloadedJobId, setAutoDownloadedJobId] = useState<string | null>(null);
  const [failedJobAlertId, setFailedJobAlertId] = useState<string | null>(null);

  const allOutputFields = useMemo(
    () => [
      ...groupBy,
      ...selectedFields,
      ...aggregations.map((aggregation) => aggregation.alias || `${aggregation.function}_${aggregation.field}`),
    ],
    [groupBy, selectedFields, aggregations]
  );

  const manualExportJobs = useMemo(
    () => exportJobs.filter((job) => job.source === 'manual'),
    [exportJobs]
  );

  const activeExportJob = activeExportJobId
    ? exportJobs.find((job) => job.id === activeExportJobId) || null
    : null;

  useEffect(() => {
    const loadId = searchParams.get('load');
    const templateId = searchParams.get('template');

    if (loadId) {
      dispatch(fetchSavedReportById(loadId));
    } else if (templateId) {
      void loadTemplate(templateId);
    }
  }, [searchParams, dispatch]);

  useEffect(() => {
    void dispatch(fetchReportExportJobs({ limit: 10 }));
  }, [dispatch]);

  useEffect(() => {
    if (!activeExportJobId) return;
    if (!activeExportJob || ['pending', 'processing'].includes(activeExportJob.status)) {
      const timer = window.setTimeout(() => {
        void dispatch(fetchReportExportJob(activeExportJobId));
      }, EXPORT_POLL_INTERVAL_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [activeExportJob, activeExportJobId, dispatch]);

  useEffect(() => {
    if (
      activeExportJob?.status === 'completed' &&
      activeExportJob.source === 'manual' &&
      autoDownloadedJobId !== activeExportJob.id
    ) {
      setAutoDownloadedJobId(activeExportJob.id);
      void handleDownloadExportJob(activeExportJob);
    }
  }, [activeExportJob, autoDownloadedJobId]);

  useEffect(() => {
    if (activeExportJob?.status !== 'failed') return;
    if (failedJobAlertId === activeExportJob.id) return;

    setFailedJobAlertId(activeExportJob.id);
    alert(activeExportJob.failureMessage || 'Report export failed');
  }, [activeExportJob, failedJobAlertId]);

  const loadTemplate = async (templateId: string) => {
    try {
      const definition = await reportsApiClient.instantiateTemplate(templateId);

      setEntity(definition.entity);
      setSelectedFields(definition.fields || []);
      setFilters(definition.filters || []);
      setSorts(definition.sort || []);
      setGroupBy(definition.groupBy || []);
      setAggregations(definition.aggregations || []);
      setRowLimit(definition.limit ? String(definition.limit) : '500');
      setSavedReportName(definition.name);
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Failed to load template');
    }
  };

  useEffect(() => {
    if (currentSavedReport) {
      setEntity(currentSavedReport.entity);
      setSelectedFields(currentSavedReport.report_definition.fields || []);
      setFilters(currentSavedReport.report_definition.filters || []);
      setSorts(currentSavedReport.report_definition.sort || []);
      setGroupBy(currentSavedReport.report_definition.groupBy || []);
      setAggregations(currentSavedReport.report_definition.aggregations || []);
      setRowLimit(currentSavedReport.report_definition.limit ? String(currentSavedReport.report_definition.limit) : '500');
      setSavedReportName(currentSavedReport.name);
      setSavedReportDescription(currentSavedReport.description || '');
    }
  }, [currentSavedReport]);

  const buildDefinition = (): ReportDefinition => {
    const parsedLimit = Number.parseInt(rowLimit, 10);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 10000) : undefined;

    return {
      name: savedReportName || `${entity}_report_${new Date().toISOString().split('T')[0]}`,
      entity,
      fields: selectedFields.length > 0 ? selectedFields : undefined,
      filters,
      sort: sorts,
      groupBy: groupBy.length > 0 ? groupBy : undefined,
      aggregations: aggregations.length > 0 ? aggregations : undefined,
      limit: safeLimit,
    };
  };

  const handleGenerateReport = async () => {
    if (selectedFields.length === 0 && aggregations.length === 0) {
      alert('Please select at least one field or aggregation');
      return;
    }

    await dispatch(generateReport(buildDefinition()));
  };

  const handleStartExport = async (format: 'csv' | 'xlsx') => {
    if (!currentReport || currentReport.data.length === 0) {
      alert('No report data to export');
      return;
    }

    const action = await dispatch(
      createReportExportJob({
        definition: buildDefinition(),
        format,
        savedReportId: currentSavedReport?.id,
        idempotencyKey: createExportIdempotencyKey(entity, format),
      })
    );

    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      String(action.type).endsWith('/rejected')
    ) {
      alert('Failed to start report export');
    }
  };

  const handleDownloadExportJob = async (job: ReportExportJob) => {
    setDownloadingJobId(job.id);

    try {
      const file = await reportsApiClient.downloadExportJob(job.id, getExportFallbackFilename(job));
      triggerFileDownload(file);
    } catch (error) {
      console.error('Report export download failed', error);
      alert('Failed to download export artifact');
    } finally {
      setDownloadingJobId((current) => (current === job.id ? null : current));
    }
  };

  const handleRetryExportJob = async (job: ReportExportJob) => {
    const action = await dispatch(
      createReportExportJob({
        definition: job.definition,
        format: job.format,
        savedReportId: job.savedReportId || undefined,
        scheduledReportId: job.scheduledReportId || undefined,
        idempotencyKey: createExportIdempotencyKey(job.entity, job.format),
      })
    );

    if (
      typeof action === 'object' &&
      action !== null &&
      'type' in action &&
      String(action.type).endsWith('/rejected')
    ) {
      alert('Failed to retry report export');
    }
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.text(`${entity.toUpperCase()} REPORT`, 14, 15);

    const body = currentReport?.data.map((row) => allOutputFields.map((field) => String(row[field] ?? ''))) || [];

    autoTable(doc, {
      head: [allOutputFields.map((field) => field.replace(/_/g, ' ').toUpperCase())],
      body,
      startY: 20,
    });

    doc.save(`${entity}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSaveReport = async () => {
    if (!savedReportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    if (selectedFields.length === 0 && aggregations.length === 0) {
      alert('Please select at least one field or aggregation before saving');
      return;
    }

    await dispatch(
      createSavedReport({
        name: savedReportName,
        description: savedReportDescription || undefined,
        entity,
        report_definition: {
          name: savedReportName,
          entity,
          fields: selectedFields.length > 0 ? selectedFields : undefined,
          filters,
          sort: sorts,
          groupBy: groupBy.length > 0 ? groupBy : undefined,
          aggregations: aggregations.length > 0 ? aggregations : undefined,
          limit:
            Number.isFinite(Number.parseInt(rowLimit, 10)) && Number.parseInt(rowLimit, 10) > 0
              ? Math.min(Number.parseInt(rowLimit, 10), 10000)
              : undefined,
        },
      })
    );

    setShowSaveDialog(false);
    setSavedReportName('');
    setSavedReportDescription('');
    alert('Report saved successfully!');
  };

  const handleEntityChange = (newEntity: ReportEntity) => {
    setEntity(newEntity);
    setSelectedFields([]);
    setFilters([]);
    setSorts([]);
    setGroupBy([]);
    setAggregations([]);
    setRowLimit('500');
    setShowChart(false);
  };

  return (
    <NeoBrutalistLayout pageTitle="REPORTS">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Report Builder"
          description="Create custom reports by selecting entities, fields, filters, and exports."
          actions={
            <>
              <SecondaryButton onClick={() => navigate('/reports/templates')}>KPI Templates</SecondaryButton>
              <SecondaryButton onClick={() => navigate('/reports/outcomes')}>Outcomes Report</SecondaryButton>
              <SecondaryButton onClick={() => navigate('/reports/workflow-coverage')}>
                Workflow Coverage
              </SecondaryButton>
            </>
          }
        />

        <SectionCard title="1. Select Entity" subtitle="Choose the source dataset for this report.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ENTITIES.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => handleEntityChange(entry.value)}
                className={`rounded-[var(--ui-radius-sm)] border px-3 py-2 text-sm font-semibold ${
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

        <SectionCard title="2. Select Fields">
          <FieldSelector entity={entity} selectedFields={selectedFields} onChange={setSelectedFields} />
        </SectionCard>

        <SectionCard title="3. Group By (Optional)">
          <div className="flex flex-wrap gap-2">
            {(availableFields[entity] || [])
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
                    className={`rounded-[var(--ui-radius-sm)] border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
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

        <SectionCard title="4. Aggregations (Optional)">
          <div className="space-y-4">
            {(availableFields[entity] || [])
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
                              setAggregations([...aggregations, { field: field.field, function: func }]);
                            }
                          }}
                          className={`rounded-[var(--ui-radius-sm)] border px-3 py-1 text-xs font-semibold uppercase ${
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

        <SectionCard title="5. Add Filters (Optional)">
          <FilterBuilder entity={entity} filters={filters} onChange={setFilters} />
        </SectionCard>

        <SectionCard title="6. Add Sorting (Optional)">
          <SortBuilder
            entity={entity}
            selectedFields={allOutputFields}
            sorts={sorts}
            onChange={setSorts}
          />
        </SectionCard>

        <SectionCard title="7. Row Limit">
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

        <SectionCard title="8. Generate & Export">
          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              onClick={() => void handleGenerateReport()}
              disabled={loading || (selectedFields.length === 0 && aggregations.length === 0)}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </PrimaryButton>

            <SecondaryButton
              onClick={() => setShowSaveDialog(true)}
              disabled={selectedFields.length === 0 && aggregations.length === 0}
            >
              Save Definition
            </SecondaryButton>

            {reportRows.length > 0 && (
              <>
                <SecondaryButton onClick={() => void handleStartExport('csv')}>
                  Export CSV
                </SecondaryButton>
                <SecondaryButton onClick={() => void handleStartExport('xlsx')}>
                  Export Excel
                </SecondaryButton>
                <SecondaryButton onClick={() => void handleExportPDF()}>Export PDF</SecondaryButton>
                <SecondaryButton onClick={() => setShowChart((value) => !value)}>
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
                      {job.status === 'completed' && (
                        <SecondaryButton
                          onClick={() => void handleDownloadExportJob(job)}
                          disabled={downloadingJobId === job.id}
                        >
                          {downloadingJobId === job.id ? 'Downloading...' : 'Download'}
                        </SecondaryButton>
                      )}
                      <SecondaryButton onClick={() => void handleRetryExportJob(job)}>
                        Retry Export
                      </SecondaryButton>
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
                {[...selectedFields, ...aggregations.map((item) => item.alias || `${item.function}_${item.field}`)].map(
                  (field) => (
                    <option key={field} value={field}>
                      {field.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  )
                )}
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
          <SectionCard title="Data Preview" subtitle={`Showing ${Math.min(reportRows.length, 50)} of ${reportRows.length} rows`}>
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
                          {row[field] !== null && row[field] !== undefined ? String(row[field]) : '-'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
                <SecondaryButton
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSavedReportName('');
                    setSavedReportDescription('');
                  }}
                >
                  Cancel
                </SecondaryButton>
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
