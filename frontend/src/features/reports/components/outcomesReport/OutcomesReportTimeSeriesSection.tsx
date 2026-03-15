import {
  EmptyState,
  SectionCard,
} from '../../../../components/ui';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { seriesColors } from '../../utils/outcomesReport';

interface OutcomesReportTimeSeriesSectionProps {
  outcomeSeries: string[];
  timeseriesChartData: Array<Record<string, string | number>>;
}

export default function OutcomesReportTimeSeriesSection({
  outcomeSeries,
  timeseriesChartData,
}: OutcomesReportTimeSeriesSectionProps) {
  return (
    <SectionCard
      title="Time Series"
      subtitle="Trend lines are grouped by workflow stage so conversation, appointment, follow-up, and case-status outcomes remain visible."
    >
      {timeseriesChartData.length === 0 ? (
        <EmptyState
          title="No time-series data"
          description="No trend points are available for the selected filters."
        />
      ) : (
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeseriesChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucketLabel" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {outcomeSeries.map((outcomeName, index) => (
                <Bar
                  key={outcomeName}
                  dataKey={outcomeName}
                  stackId="outcomes"
                  fill={seriesColors[index % seriesColors.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}
