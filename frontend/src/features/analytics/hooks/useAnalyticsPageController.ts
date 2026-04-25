import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchAnalyticsSummary,
  fetchComparativeAnalytics,
  fetchDonationTrends,
  fetchEventAttendanceTrends,
  fetchVolunteerHoursTrends,
  setFilters,
} from '../state';
import { exportAnalyticsSummaryToPDF } from '../../../utils/exportUtils';
import { parseAllowedValue } from '../../../utils/persistedFilters';

export const COMPARISON_PERIOD_VALUES = ['month', 'quarter', 'year'] as const;
export type ComparisonPeriod = (typeof COMPARISON_PERIOD_VALUES)[number];

const normalizeDateParam = (value: string | null): string =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';

const buildAnalyticsParams = ({
  startDate,
  endDate,
  period,
}: {
  startDate: string;
  endDate: string;
  period: ComparisonPeriod;
}) => {
  const params = new URLSearchParams();
  if (startDate) {
    params.set('start_date', startDate);
  }
  if (endDate) {
    params.set('end_date', endDate);
  }
  if (period !== 'month') {
    params.set('period', period);
  }
  return params;
};

export function useAnalyticsPageController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const dispatch = useAppDispatch();
  const analyticsState = useAppSelector((state) => state.analytics);
  const {
    summary,
    summaryLoading,
    trendsLoading,
    comparativeAnalytics,
    comparativeLoading,
  } = analyticsState;

  const appliedStartDate = normalizeDateParam(searchParams.get('start_date'));
  const appliedEndDate = normalizeDateParam(searchParams.get('end_date'));
  const comparisonPeriod =
    parseAllowedValue(searchParams.get('period'), COMPARISON_PERIOD_VALUES) || 'month';
  const [dateRange, setDateRange] = useState({
    start_date: appliedStartDate,
    end_date: appliedEndDate,
  });
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [summaryPdfExporting, setSummaryPdfExporting] = useState(false);

  useEffect(() => {
    setDateRange((current) =>
      current.start_date === appliedStartDate && current.end_date === appliedEndDate
        ? current
        : {
            start_date: appliedStartDate,
            end_date: appliedEndDate,
          }
    );
  }, [appliedStartDate, appliedEndDate]);

  useEffect(() => {
    const sanitizedParams = buildAnalyticsParams({
      startDate: appliedStartDate,
      endDate: appliedEndDate,
      period: comparisonPeriod,
    });
    const nextParams = sanitizedParams.toString();
    if (searchParamsString !== nextParams) {
      setSearchParams(sanitizedParams, { replace: true });
    }
  }, [appliedStartDate, appliedEndDate, comparisonPeriod, searchParamsString, setSearchParams]);

  useEffect(() => {
    dispatch(
      setFilters({
        start_date: appliedStartDate || undefined,
        end_date: appliedEndDate || undefined,
      })
    );
  }, [appliedEndDate, appliedStartDate, dispatch]);

  const refreshAnalytics = useCallback(() => {
    dispatch(
      fetchAnalyticsSummary({
        start_date: appliedStartDate || undefined,
        end_date: appliedEndDate || undefined,
      })
    );
    dispatch(fetchDonationTrends(12));
    dispatch(fetchVolunteerHoursTrends(12));
    dispatch(fetchEventAttendanceTrends(12));
    dispatch(fetchComparativeAnalytics(comparisonPeriod));
  }, [appliedEndDate, appliedStartDate, comparisonPeriod, dispatch]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  useEffect(() => {
    if (!summary && !comparativeAnalytics) {
      return;
    }
    if (summaryLoading || trendsLoading || comparativeLoading) {
      return;
    }
    setLastUpdatedAt(new Date());
  }, [summary, comparativeAnalytics, summaryLoading, trendsLoading, comparativeLoading]);

  const handleApplyFilters = () => {
    setSearchParams(
      buildAnalyticsParams({
        startDate: dateRange.start_date,
        endDate: dateRange.end_date,
        period: comparisonPeriod,
      }),
      { replace: true }
    );
  };

  const handleClearFilters = () => {
    setDateRange({ start_date: '', end_date: '' });
    setSearchParams(
      buildAnalyticsParams({
        startDate: '',
        endDate: '',
        period: comparisonPeriod,
      }),
      { replace: true }
    );
  };

  const handleComparisonChange = (nextPeriod: ComparisonPeriod) => {
    setSearchParams(
      buildAnalyticsParams({
        startDate: appliedStartDate,
        endDate: appliedEndDate,
        period: nextPeriod,
      }),
      { replace: true }
    );
  };

  const handleExportSummaryPdf = async () => {
    if (!summary || summaryPdfExporting) return;

    setSummaryPdfExporting(true);
    try {
      await exportAnalyticsSummaryToPDF(summary);
    } finally {
      setSummaryPdfExporting(false);
    }
  };

  return {
    ...analyticsState,
    dateRange,
    setDateRange,
    lastUpdatedAt,
    summaryPdfExporting,
    appliedStartDate,
    appliedEndDate,
    comparisonPeriod,
    handleApplyFilters,
    handleClearFilters,
    handleComparisonChange,
    handleExportSummaryPdf,
    refreshAnalytics,
  };
}
