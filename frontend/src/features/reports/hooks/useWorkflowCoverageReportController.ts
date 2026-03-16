import { useEffect, useState } from 'react';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import { reportsApiClient } from '../api/reportsApiClient';
import type {
  WorkflowCoverageFilters,
  WorkflowCoverageMissingFilter,
  WorkflowCoverageReportResult,
} from '../types/contracts';

export function useWorkflowCoverageReportController() {
  const [filters, setFilters] = useState<WorkflowCoverageFilters>({});
  const [report, setReport] = useState<WorkflowCoverageReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatLoadError = formatApiErrorMessageWith('Failed to load workflow coverage report');

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextReport = await reportsApiClient.fetchWorkflowCoverageReport(filters);
        if (active) {
          setReport(nextReport);
        }
      } catch (loadError) {
        console.error('Failed to load workflow coverage report', loadError);
        if (active) {
          setError(formatLoadError(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadReport();
    return () => {
      active = false;
    };
  }, [filters, formatLoadError]);

  const handleFilterChange = <K extends keyof WorkflowCoverageFilters>(
    key: K,
    value: WorkflowCoverageFilters[K]
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleMissingFilterChange = (value: string) => {
    handleFilterChange(
      'missing',
      (value || undefined) as WorkflowCoverageMissingFilter | undefined
    );
  };

  const handleRetry = () => {
    setFilters((current) => ({ ...current }));
  };

  return {
    error,
    filters,
    handleFilterChange,
    handleMissingFilterChange,
    handleRetry,
    loading,
    report,
  };
}

export default useWorkflowCoverageReportController;
