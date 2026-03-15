import {
  EmptyState,
  SectionCard,
} from '../../../../components/ui';
import type { OutcomesReportData } from '../../../../types/outcomes';
import {
  workflowStageLabels,
  workflowStageOrder,
} from '../../utils/outcomesReport';

interface OutcomesReportSummarySectionProps {
  report: OutcomesReportData;
}

export default function OutcomesReportSummarySection({
  report,
}: OutcomesReportSummarySectionProps) {
  return (
    <SectionCard title="Totals by Outcome">
      {report.totalsByOutcome.length === 0 ? (
        <EmptyState
          title="No outcomes in selected period"
          description="Adjust filters or date range to include reported outcome activity."
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--ui-radius-sm)] border border-app-border-muted">
          <table className="min-w-full divide-y divide-app-border-muted bg-app-surface text-sm">
            <thead className="bg-app-surface-muted">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Outcome
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Total Impacts
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Total Unique Clients
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Interaction Impacts
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Event Impacts
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                  Workflow Stages
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border-muted">
              {report.totalsByOutcome.map((row) => (
                <tr key={row.outcomeDefinitionId}>
                  <td className="px-3 py-2 text-sm text-app-text">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-app-text-muted">{row.key}</p>
                  </td>
                  <td className="px-3 py-2 text-sm text-app-text">{row.countImpacts}</td>
                  <td className="px-3 py-2 text-sm text-app-text">{row.uniqueClientsImpacted}</td>
                  <td className="px-3 py-2 text-sm text-app-text">
                    {row.sourceBreakdown.interaction.countImpacts}
                  </td>
                  <td className="px-3 py-2 text-sm text-app-text">
                    {row.sourceBreakdown.event.countImpacts}
                  </td>
                  <td className="px-3 py-2 text-sm text-app-text">
                    <div className="flex flex-wrap gap-1">
                      {workflowStageOrder
                        .filter((stage) => row.workflowStageBreakdown[stage] > 0)
                        .map((stage) => (
                          <span
                            key={stage}
                            className="inline-flex items-center rounded-full border border-app-border px-2 py-1 text-xs text-app-text-muted"
                          >
                            {workflowStageLabels[stage]}: {row.workflowStageBreakdown[stage]}
                          </span>
                        ))}
                      {workflowStageOrder.every(
                        (stage) => row.workflowStageBreakdown[stage] === 0
                      ) && (
                        <span className="text-xs text-app-text-muted">No staged outcomes</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
