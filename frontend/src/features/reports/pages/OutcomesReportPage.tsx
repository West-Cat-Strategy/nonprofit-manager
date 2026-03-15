import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import {
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
} from '../../../components/ui';
import { useOutcomesReportController } from '../hooks/useOutcomesReportController';
import OutcomesReportFiltersCard from '../components/outcomesReport/OutcomesReportFiltersCard';
import OutcomesReportSummarySection from '../components/outcomesReport/OutcomesReportSummarySection';
import OutcomesReportTimeSeriesSection from '../components/outcomesReport/OutcomesReportTimeSeriesSection';

const OutcomesReportPage = () => {
  const {
    error,
    filters,
    handleCsvExport,
    handleFilterChange,
    handleRetry,
    loading,
    outcomeSeries,
    report,
    timeseriesChartData,
  } = useOutcomesReportController();

  return (
    <NeoBrutalistLayout pageTitle="OUTCOMES REPORT">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Outcomes Report"
          description="Track outcomes across both interaction tags and case outcome events."
          actions={
            <PrimaryButton
              onClick={handleCsvExport}
              disabled={!report || report.totalsByOutcome.length === 0}
            >
              Export CSV
            </PrimaryButton>
          }
        />

        <OutcomesReportFiltersCard
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {loading && <LoadingState label="Loading outcomes report..." />}

        {!loading && error && (
          <ErrorState message={error} onRetry={handleRetry} retryLabel="Retry" />
        )}

        {!loading && !error && report && (
          <>
            <OutcomesReportSummarySection report={report} />
            <OutcomesReportTimeSeriesSection
              outcomeSeries={outcomeSeries}
              timeseriesChartData={timeseriesChartData}
            />
          </>
        )}
      </div>
    </NeoBrutalistLayout>
  );
};

export default OutcomesReportPage;
