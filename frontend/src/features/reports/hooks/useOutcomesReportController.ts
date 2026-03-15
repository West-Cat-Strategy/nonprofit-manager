import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchOutcomesReport } from '../../outcomes/state';
import type { OutcomesReportFilters } from '../../../types/outcomes';
import {
  buildOutcomesReportCsv,
  buildOutcomesReportSeries,
  buildOutcomesReportTimeseriesData,
  getDefaultOutcomesReportFilters,
} from '../utils/outcomesReport';

export type OutcomesReportFilterChange = <K extends keyof OutcomesReportFilters>(
  key: K,
  value: OutcomesReportFilters[K]
) => void;

export const useOutcomesReportController = () => {
  const dispatch = useAppDispatch();
  const { report, loading, error } = useAppSelector((state) => state.outcomesReports);
  const [filters, setFilters] = useState<OutcomesReportFilters>(getDefaultOutcomesReportFilters);

  useEffect(() => {
    void dispatch(fetchOutcomesReport(filters));
  }, [dispatch, filters]);

  const timeseriesChartData = useMemo(
    () => buildOutcomesReportTimeseriesData(report),
    [report]
  );
  const outcomeSeries = useMemo(
    () => buildOutcomesReportSeries(report, filters.source),
    [filters.source, report]
  );

  const handleFilterChange: OutcomesReportFilterChange = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleRetry = () => {
    void dispatch(fetchOutcomesReport(filters));
  };

  const handleCsvExport = () => {
    const csvContent = buildOutcomesReportCsv(report);
    if (!csvContent) {
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outcomes-report-${filters.from}-to-${filters.to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    error,
    filters,
    handleCsvExport,
    handleFilterChange,
    handleRetry,
    loading,
    outcomeSeries,
    report,
    timeseriesChartData,
  };
};
