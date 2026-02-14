import { memo } from 'react';
import { Link } from 'react-router-dom';

interface PriorityCardProps {
  label: string;
  value: number;
  description: string;
  linkText: string;
  linkTo: string;
  accentColor: string;
  textColor: string;
}

const PriorityCard = memo(function PriorityCard({
  label,
  value,
  description,
  linkText,
  linkTo,
  accentColor,
  textColor,
}: PriorityCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface/85 p-5 shadow-sm"
      role="article"
      aria-label={`${label}: ${value} - ${description}`}
    >
      <div className={`absolute -right-10 -top-10 h-20 w-20 rounded-full ${accentColor}`} aria-hidden="true" />
      <div className="relative">
        <p className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>{label}</p>
        <p className="mt-2 text-2xl font-semibold text-app-text">{value}</p>
        <p className="mt-1 text-sm text-app-text-muted">{description}</p>
        <Link
          className={`mt-3 inline-flex text-xs font-semibold ${textColor} hover:opacity-80 focus:outline-none focus:underline`}
          to={linkTo}
        >
          {linkText}
        </Link>
      </div>
    </div>
  );
});

interface PriorityCardsProps {
  urgentCasesCount: number;
  casesDueThisWeekCount: number;
  highEngagementCount: number;
}

function PriorityCards({ urgentCasesCount, casesDueThisWeekCount, highEngagementCount }: PriorityCardsProps) {
  return (
    <section className="mt-6" aria-label="Priority overview">
      <div className="grid gap-4 md:grid-cols-3">
        <PriorityCard
          label="Priority"
          value={urgentCasesCount}
          description="Urgent cases need attention"
          linkText="Review cases"
          linkTo="/cases"
          accentColor="bg-rose-200/50"
          textColor="text-rose-500"
        />
        <PriorityCard
          label="This Week"
          value={casesDueThisWeekCount}
          description="Cases due for follow-up"
          linkText="Plan follow-ups"
          linkTo="/cases"
          accentColor="bg-amber-200/50"
          textColor="text-amber-500"
        />
        <PriorityCard
          label="Engagement"
          value={highEngagementCount}
          description="Highly engaged constituents"
          linkText="View reports"
          linkTo="/analytics"
          accentColor="bg-emerald-200/50"
          textColor="text-emerald-600"
        />
      </div>
    </section>
  );
}

export default memo(PriorityCards);
