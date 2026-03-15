import type {
  OutcomeReportSource,
  OutcomesReportData,
  OutcomesReportFilters,
  OutcomeWorkflowStage,
} from '../../../types/outcomes';

export const getDateString = (date: Date): string => date.toISOString().split('T')[0];

export const getDefaultOutcomesReportFilters = (): OutcomesReportFilters => {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(now.getMonth() - 2);

  return {
    from: getDateString(from),
    to: getDateString(now),
    bucket: 'month',
    includeNonReportable: false,
    source: 'all',
  };
};

export const formatBucket = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const workflowStageOrder: OutcomeWorkflowStage[] = [
  'interaction',
  'conversation',
  'appointment',
  'follow_up',
  'case_status',
  'manual',
  'legacy',
];

export const workflowStageLabels: Record<OutcomeWorkflowStage, string> = {
  interaction: 'Interaction',
  conversation: 'Conversation',
  appointment: 'Appointment',
  follow_up: 'Follow-up',
  case_status: 'Case status',
  manual: 'Manual',
  legacy: 'Legacy',
};

export const interactionTypeOptions: Array<{
  label: string;
  value: NonNullable<OutcomesReportFilters['interactionType']>;
}> = [
  { label: 'Note', value: 'note' },
  { label: 'Email', value: 'email' },
  { label: 'Call', value: 'call' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Update', value: 'update' },
  { label: 'Status Change', value: 'status_change' },
  { label: 'Other', value: 'other' },
];

export const seriesColors = [
  'var(--loop-blue)',
  'var(--loop-yellow)',
  'var(--loop-green)',
  'var(--loop-purple)',
  'var(--loop-red)',
  'var(--loop-cyan)',
  '#1f8f5f',
  '#b45a1a',
  '#4b5dff',
  '#9466ff',
  '#0b7285',
  '#9a031e',
];

export const formatSeriesKey = (
  outcomeName: string,
  workflowStage: OutcomeWorkflowStage
): string => `${outcomeName} (${workflowStageLabels[workflowStage]})`;

export const matchesSourceFilter = (
  source: OutcomeReportSource,
  filter: OutcomesReportFilters['source']
): boolean => filter === undefined || filter === 'all' || source === filter;

export const buildOutcomesReportTimeseriesData = (
  report: OutcomesReportData | null
): Array<Record<string, string | number>> => {
  if (!report) {
    return [];
  }

  const outcomeNameById = new Map(
    report.totalsByOutcome.map((row) => [row.outcomeDefinitionId, row.name])
  );

  const grouped = new Map<string, Record<string, string | number>>();

  for (const point of report.timeseries) {
    const key = point.bucketStart;
    const outcomeName =
      outcomeNameById.get(point.outcomeDefinitionId) || point.outcomeDefinitionId;
    const seriesKey = formatSeriesKey(outcomeName, point.workflowStage);

    if (!grouped.has(key)) {
      grouped.set(key, { bucketStart: key });
    }

    const current = grouped.get(key);
    if (!current) {
      continue;
    }

    current[seriesKey] = Number(current[seriesKey] || 0) + point.countImpacts;
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
    .map(([bucketStart, values]) => ({
      ...values,
      bucketStart,
      bucketLabel: formatBucket(bucketStart),
    }));
};

export const buildOutcomesReportSeries = (
  report: OutcomesReportData | null,
  sourceFilter: OutcomesReportFilters['source']
): string[] => {
  if (!report) {
    return [];
  }

  const outcomeNameById = new Map(
    report.totalsByOutcome.map((row) => [row.outcomeDefinitionId, row.name])
  );

  return Array.from(
    new Set(
      report.timeseries
        .filter((point) => matchesSourceFilter(point.source, sourceFilter))
        .map((point) =>
          formatSeriesKey(
            outcomeNameById.get(point.outcomeDefinitionId) || point.outcomeDefinitionId,
            point.workflowStage
          )
        )
    )
  );
};

export const buildOutcomesReportCsv = (
  report: OutcomesReportData | null
): string | null => {
  if (!report || report.totalsByOutcome.length === 0) {
    return null;
  }

  const headers = [
    'Outcome',
    'Key',
    'Total Impacts',
    'Unique Clients Impacted',
    'Interaction Impacts',
    'Interaction Unique Clients',
    'Event Impacts',
    'Event Unique Clients',
    ...workflowStageOrder.map((stage) => `${workflowStageLabels[stage]} Impacts`),
  ];

  const rows = report.totalsByOutcome.map((row) => [
    row.name,
    row.key,
    String(row.countImpacts),
    String(row.uniqueClientsImpacted),
    String(row.sourceBreakdown.interaction.countImpacts),
    String(row.sourceBreakdown.interaction.uniqueClientsImpacted),
    String(row.sourceBreakdown.event.countImpacts),
    String(row.sourceBreakdown.event.uniqueClientsImpacted),
    ...workflowStageOrder.map((stage) => String(row.workflowStageBreakdown[stage] || 0)),
  ]);

  return [headers, ...rows]
    .map((row) =>
      row.map((value) => (value.includes(',') ? `"${value}"` : value)).join(',')
    )
    .join('\n');
};
