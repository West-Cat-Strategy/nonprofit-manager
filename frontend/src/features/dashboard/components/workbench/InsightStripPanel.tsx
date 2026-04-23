import { Link } from 'react-router-dom';
import { useDashboardAnalyticsSummary } from '../../context/DashboardDataContext';
import {
  formatWorkbenchCurrency,
  formatWorkbenchNumber,
} from './workbenchUtils';
import {
  SummaryMetric,
  WorkbenchPanelHeader,
  workbenchActionClassName,
  workbenchPanelClassName,
} from './WorkbenchPanelPrimitives';

export default function InsightStripPanel() {
  const analyticsSummaryLane = useDashboardAnalyticsSummary();
  const analyticsSummary = analyticsSummaryLane?.analyticsSummary;

  if (!analyticsSummary) {
    return (
      <section className={workbenchPanelClassName}>
        <h2 className="text-lg font-semibold text-app-text-heading">Insight Strip</h2>
        <p className="mt-2 text-sm text-app-text-muted">
          Insights will appear here after the lightweight workbench finishes loading.
        </p>
      </section>
    );
  }

  const engagedConstituents =
    analyticsSummary.engagement_distribution.high + analyticsSummary.engagement_distribution.medium;

  return (
    <section className={workbenchPanelClassName}>
      <WorkbenchPanelHeader
        title="Insight Strip"
        description="Compact organization-wide signals, kept below the productivity-focused workspace blocks."
        action={
          <Link to="/analytics" className={workbenchActionClassName}>
            Open analytics
          </Link>
        }
      />

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Donations YTD"
          value={formatWorkbenchCurrency(analyticsSummary.total_donations_ytd)}
          description={`${analyticsSummary.donation_count_ytd} gifts recorded this year.`}
        />
        <SummaryMetric
          label="Volunteer Hours"
          value={formatWorkbenchNumber(analyticsSummary.total_volunteer_hours_ytd)}
          description={`${analyticsSummary.total_volunteers} volunteers are currently rostered.`}
        />
        <SummaryMetric
          label="Events"
          value={formatWorkbenchNumber(analyticsSummary.total_events_ytd)}
          description="Events logged so far this year."
        />
        <SummaryMetric
          label="Engagement"
          value={formatWorkbenchNumber(engagedConstituents)}
          description="Constituents with high or medium engagement."
        />
      </div>
    </section>
  );
}
