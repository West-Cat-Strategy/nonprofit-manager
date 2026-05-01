import {
  BellAlertIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { AlertStats } from '../types';

interface AlertSummaryCardsProps {
  stats: AlertStats | null;
}

export default function AlertSummaryCards({ stats }: AlertSummaryCardsProps) {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5">
        <p className="inline-flex items-center gap-2 text-sm text-app-text-muted">
          <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
          Alert rules
        </p>
        <p className="text-2xl font-bold text-app-text-heading">{stats.total_alerts}</p>
      </div>
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5">
        <p className="inline-flex items-center gap-2 text-sm text-app-text-muted">
          <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
          Active alert rules
        </p>
        <p className="text-2xl font-bold text-app-accent">{stats.active_alerts}</p>
      </div>
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5">
        <p className="inline-flex items-center gap-2 text-sm text-app-text-muted">
          <ClockIcon className="h-4 w-4" aria-hidden="true" />
          Triggered today
        </p>
        <p className="text-2xl font-bold text-app-accent">{stats.triggered_today}</p>
      </div>
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5">
        <p className="inline-flex items-center gap-2 text-sm text-app-text-muted">
          <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
          This week
        </p>
        <p className="text-2xl font-bold text-app-text-heading">{stats.triggered_this_week}</p>
      </div>
    </div>
  );
}
