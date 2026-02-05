/**
 * Case Summary Cards Component
 * Displays key metrics for case management
 */

import type { CaseSummary } from '../../types/case';

interface CaseSummaryCardsProps {
  summary: CaseSummary;
}

export default function CaseSummaryCards({ summary }: CaseSummaryCardsProps) {
  const cards = [
    { label: 'Open', value: summary.open_cases, color: 'bg-white' },
    { label: 'Urgent', value: summary.by_priority.urgent, color: 'bg-[var(--loop-pink)]' },
    { label: 'Due This Week', value: summary.cases_due_this_week, color: 'bg-[var(--loop-yellow)]' },
    { label: 'Unassigned', value: summary.unassigned_cases, color: 'bg-[var(--loop-cyan)]' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`border-2 border-black dark:border-white ${card.color} px-4 py-3 shadow-[3px_3px_0px_var(--shadow-color)]`}
        >
          <div className="text-xs font-black uppercase text-black/70 dark:text-black/70">
            {card.label}
          </div>
          <div className="text-2xl font-black text-black">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
