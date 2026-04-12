import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { triggerFileDownload } from '../../../services/fileDownload';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import { reportsApiClient } from '../api/reportsApiClient';
import { savedReportsApiClient } from '../../savedReports/api/savedReportsApiClient';
import type {
  ReportAggregation,
  ReportDefinition,
  ReportEntity,
  ReportExportJob,
  ReportField,
  ReportFilter,
  ReportResult,
  ReportSort,
} from '../../../types/report';
import type { SavedReport } from '../../../types/savedReport';

const EXPORT_POLL_INTERVAL_MS = 2000;

const buildInitialAvailableFields = (): Record<ReportEntity, ReportField[] | null> => ({
  accounts: null,
  contacts: null,
  donations: null,
  events: null,
  appointments: null,
  follow_ups: null,
  attendance: null,
  volunteers: null,
  tasks: null,
  cases: null,
  opportunities: null,
  expenses: null,
  grants: null,
  programs: null,
});

const createExportIdempotencyKey = (entity: ReportEntity, format: 'csv' | 'xlsx'): string => {
  const suffix =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `report-builder:${entity}:${format}:${suffix}`;
};

const sortExportJobs = (jobs: ReportExportJob[]): ReportExportJob[] =>
  [...jobs].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

const upsertExportJob = (jobs: ReportExportJob[], incoming: ReportExportJob): ReportExportJob[] => {
  const index = jobs.findIndex((job) => job.id === incoming.id);
  if (index === -1) {
    return sortExportJobs([incoming, ...jobs]);
  }

  const next = [...jobs];
  next[index] = incoming;
  return sortExportJobs(next);
};

const toReportDefinitionFromSavedReport = (savedReport: SavedReport): ReportDefinition => ({
  name: savedReport.name,
  entity: savedReport.entity,
  fields: savedReport.report_definition.fields || [],
  filters: savedReport.report_definition.filters || [],
  sort: savedReport.report_definition.sort || [],
  groupBy: savedReport.report_definition.groupBy || [],
  aggregations: savedReport.report_definition.aggregations || [],
  limit: savedReport.report_definition.limit,
});

export function useReportBuilderController() {
  const [searchParams] = useSearchParams();
  const [currentReport, setCurrentReport] = useState<ReportResult | null>(null);
  const [currentSavedReport, setCurrentSavedReport] = useState<SavedReport | null>(null);
  const [availableFieldsByEntity, setAvailableFieldsByEntity] = useState<
    Record<ReportEntity, ReportField[] | null>
  >(() => buildInitialAvailableFields());
  const [exportJobs, setExportJobs] = useState<ReportExportJob[]>([]);
  const [exportJobsLoading, setExportJobsLoading] = useState(false);
  const [activeExportJobId, setActiveExportJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportJobError, setExportJobError] = useState<string | null>(null);
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

  const formatGenerateError = useMemo(
    () => formatApiErrorMessageWith('Failed to generate report'),
    []
  );
  const formatFieldsError = useMemo(
    () => formatApiErrorMessageWith('Failed to load available fields'),
    []
  );
  const formatExportsError = useMemo(
    () => formatApiErrorMessageWith('Failed to load report exports'),
    []
  );
  const formatExportRefreshError = useMemo(
    () => formatApiErrorMessageWith('Failed to refresh report export'),
    []
  );
  const formatExportCreateError = useMemo(
    () => formatApiErrorMessageWith('Failed to start report export'),
    []
  );
  const formatSavedReportError = useMemo(
    () => formatApiErrorMessageWith('Failed to load saved report'),
    []
  );
  const formatSaveReportError = useMemo(
    () => formatApiErrorMessageWith('Failed to save report'),
    []
  );

  const availableFields = availableFieldsByEntity[entity] || [];
  const reportRows = currentReport?.data ?? [];
  const allOutputFields = useMemo(
    () => [
      ...groupBy,
      ...selectedFields,
      ...aggregations.map(
        (aggregation) => aggregation.alias || `${aggregation.function}_${aggregation.field}`
      ),
    ],
    [aggregations, groupBy, selectedFields]
  );
  const manualExportJobs = useMemo(
    () => exportJobs.filter((job) => job.source === 'manual'),
    [exportJobs]
  );
  const activeExportJob = activeExportJobId
    ? exportJobs.find((job) => job.id === activeExportJobId) || null
    : null;

  const applyDefinition = (definition: ReportDefinition, meta?: { description?: string }) => {
    setEntity(definition.entity);
    setSelectedFields(definition.fields || []);
    setFilters(definition.filters || []);
    setSorts(definition.sort || []);
    setGroupBy(definition.groupBy || []);
    setAggregations(definition.aggregations || []);
    setRowLimit(definition.limit ? String(definition.limit) : '500');
    setSavedReportName(definition.name);
    setSavedReportDescription(meta?.description || '');
  };

  useEffect(() => {
    let cancelled = false;

    const loadAvailableFields = async () => {
      if (availableFieldsByEntity[entity] !== null) {
        return;
      }

      try {
        setFieldsLoading(true);
        const response = await reportsApiClient.fetchAvailableFields(entity);
        if (cancelled) {
          return;
        }
        setAvailableFieldsByEntity((current) => ({
          ...current,
          [entity]: response.fields || [],
        }));
      } catch (fetchError) {
        if (!cancelled) {
          setError(formatFieldsError(fetchError));
          setAvailableFieldsByEntity((current) => ({
            ...current,
            [entity]: [],
          }));
        }
      } finally {
        if (!cancelled) {
          setFieldsLoading(false);
        }
      }
    };

    void loadAvailableFields();
    return () => {
      cancelled = true;
    };
  }, [availableFieldsByEntity, entity, formatFieldsError]);

  useEffect(() => {
    let cancelled = false;

    const loadExportJobs = async () => {
      try {
        setExportJobsLoading(true);
        setExportJobError(null);
        const jobs = await reportsApiClient.listExportJobs(10);
        if (!cancelled) {
          setExportJobs(sortExportJobs(jobs));
        }
      } catch (loadError) {
        if (!cancelled) {
          setExportJobError(formatExportsError(loadError));
        }
      } finally {
        if (!cancelled) {
          setExportJobsLoading(false);
        }
      }
    };

    void loadExportJobs();
    return () => {
      cancelled = true;
    };
  }, [formatExportsError]);

  useEffect(() => {
    let cancelled = false;
    const loadId = searchParams.get('load');
    const templateId = searchParams.get('template');

    if (!loadId && !templateId) {
      return;
    }

    const loadSearchTarget = async () => {
      if (loadId) {
        try {
          const savedReport = await savedReportsApiClient.fetchSavedReportById(loadId);
          if (cancelled) {
            return;
          }
          setCurrentSavedReport(savedReport);
          applyDefinition(toReportDefinitionFromSavedReport(savedReport), {
            description: savedReport.description || '',
          });
        } catch (loadError) {
          if (!cancelled) {
            window.alert(formatSavedReportError(loadError));
          }
        }
        return;
      }

      try {
        const definition = await reportsApiClient.instantiateTemplate(templateId as string);
        if (!cancelled) {
          setCurrentSavedReport(null);
          applyDefinition(definition);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error('Error loading template:', loadError);
          window.alert('Failed to load template');
        }
      }
    };

    void loadSearchTarget();
    return () => {
      cancelled = true;
    };
  }, [formatSavedReportError, searchParams]);

  useEffect(() => {
    if (!activeExportJobId) {
      return;
    }

    if (!activeExportJob || ['pending', 'processing'].includes(activeExportJob.status)) {
      const timer = window.setTimeout(async () => {
        try {
          setExportJobsLoading(true);
          setExportJobError(null);
          const refreshedJob = await reportsApiClient.getExportJob(activeExportJobId);
          setExportJobs((current) => upsertExportJob(current, refreshedJob));
        } catch (refreshError) {
          setExportJobError(formatExportRefreshError(refreshError));
        } finally {
          setExportJobsLoading(false);
        }
      }, EXPORT_POLL_INTERVAL_MS);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [activeExportJob, activeExportJobId, formatExportRefreshError]);

  useEffect(() => {
    if (
      activeExportJob?.status === 'completed' &&
      activeExportJob.source === 'manual' &&
      autoDownloadedJobId !== activeExportJob.id
    ) {
      setAutoDownloadedJobId(activeExportJob.id);
      void (async () => {
        try {
          setDownloadingJobId(activeExportJob.id);
          const file = await reportsApiClient.downloadExportJob(
            activeExportJob.id,
            activeExportJob.artifactFileName ||
              `${activeExportJob.entity}_report_${new Date().toISOString().split('T')[0]}.${activeExportJob.format}`
          );
          triggerFileDownload(file);
        } catch (downloadError) {
          console.error('Report export download failed', downloadError);
          window.alert('Failed to download export artifact');
        } finally {
          setDownloadingJobId((current) =>
            current === activeExportJob.id ? null : current
          );
        }
      })();
    }
  }, [activeExportJob, autoDownloadedJobId]);

  useEffect(() => {
    if (activeExportJob?.status !== 'failed') {
      return;
    }
    if (failedJobAlertId === activeExportJob.id) {
      return;
    }

    setFailedJobAlertId(activeExportJob.id);
    window.alert(activeExportJob.failureMessage || 'Report export failed');
  }, [activeExportJob, failedJobAlertId]);

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
      window.alert('Please select at least one field or aggregation');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const report = await reportsApiClient.generateReport(buildDefinition());
      setCurrentReport(report);
    } catch (generateError) {
      const message = formatGenerateError(generateError);
      setError(message);
      window.alert(message);
    } finally {
      setLoading(false);
    }
  };

  const createExportJob = async (payload: {
    definition: ReportDefinition;
    format: 'csv' | 'xlsx';
    savedReportId?: string;
    scheduledReportId?: string;
    idempotencyKey?: string;
  }): Promise<ReportExportJob | null> => {
    try {
      setExportJobsLoading(true);
      setExportJobError(null);
      const job = await reportsApiClient.createExportJob(payload);
      setActiveExportJobId(job.id);
      setExportJobs((current) => upsertExportJob(current, job));
      return job;
    } catch (createError) {
      const message = formatExportCreateError(createError);
      setExportJobError(message);
      window.alert(message);
      return null;
    } finally {
      setExportJobsLoading(false);
    }
  };

  const handleStartExport = async (format: 'csv' | 'xlsx') => {
    if (!currentReport || currentReport.data.length === 0) {
      window.alert('No report data to export');
      return;
    }

    await createExportJob({
      definition: buildDefinition(),
      format,
      savedReportId: currentSavedReport?.id,
      idempotencyKey: createExportIdempotencyKey(entity, format),
    });
  };

  const handleDownloadExportJob = async (job: ReportExportJob) => {
    setDownloadingJobId(job.id);

    try {
      const file = await reportsApiClient.downloadExportJob(
        job.id,
        job.artifactFileName ||
          `${job.entity}_report_${new Date().toISOString().split('T')[0]}.${job.format}`
      );
      triggerFileDownload(file);
    } catch (downloadError) {
      console.error('Report export download failed', downloadError);
      window.alert('Failed to download export artifact');
    } finally {
      setDownloadingJobId((current) => (current === job.id ? null : current));
    }
  };

  const handleRetryExportJob = async (job: ReportExportJob) => {
    await createExportJob({
      definition: job.definition,
      format: job.format,
      savedReportId: job.savedReportId || undefined,
      scheduledReportId: job.scheduledReportId || undefined,
      idempotencyKey: createExportIdempotencyKey(job.entity, job.format),
    });
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.text(`${entity.toUpperCase()} REPORT`, 14, 15);

    const body =
      currentReport?.data.map((row) => allOutputFields.map((field) => String(row[field] ?? ''))) ||
      [];

    autoTable(doc, {
      head: [allOutputFields.map((field) => field.replace(/_/g, ' ').toUpperCase())],
      body,
      startY: 20,
    });

    doc.save(`${entity}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleSaveReport = async () => {
    if (!savedReportName.trim()) {
      window.alert('Please enter a report name');
      return;
    }

    if (selectedFields.length === 0 && aggregations.length === 0) {
      window.alert('Please select at least one field or aggregation before saving');
      return;
    }

    try {
      const savedReport = await savedReportsApiClient.createSavedReport({
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
      });

      setCurrentSavedReport(savedReport);
      setShowSaveDialog(false);
      setSavedReportName('');
      setSavedReportDescription('');
      window.alert('Report saved successfully!');
    } catch (saveError) {
      window.alert(formatSaveReportError(saveError));
    }
  };

  const handleEntityChange = (nextEntity: ReportEntity) => {
    setEntity(nextEntity);
    setSelectedFields([]);
    setFilters([]);
    setSorts([]);
    setGroupBy([]);
    setAggregations([]);
    setRowLimit('500');
    setShowChart(false);
    setXAxisField('');
    setYAxisField('');
  };

  const resetSaveDialog = () => {
    setShowSaveDialog(false);
    setSavedReportName('');
    setSavedReportDescription('');
  };

  return {
    aggregations,
    allOutputFields,
    availableFields,
    availableFieldsByEntity,
    chartType,
    currentReport,
    currentSavedReport,
    downloadingJobId,
    entity,
    error,
    exportJobError,
    exportJobs,
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
  };
}

export default useReportBuilderController;
