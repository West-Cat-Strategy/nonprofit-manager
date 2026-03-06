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
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
        <p className="text-sm text-app-text-muted">Total Alerts</p>
        <p className="text-2xl font-bold text-app-text-heading">{stats.total_alerts}</p>
      </div>
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
        <p className="text-sm text-app-text-muted">Active Alerts</p>
        <p className="text-2xl font-bold text-app-accent">{stats.active_alerts}</p>
      </div>
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
        <p className="text-sm text-app-text-muted">Triggered Today</p>
        <p className="text-2xl font-bold text-app-accent">{stats.triggered_today}</p>
      </div>
      <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
        <p className="text-sm text-app-text-muted">This Week</p>
        <p className="text-2xl font-bold text-app-text-heading">{stats.triggered_this_week}</p>
      </div>
    </div>
  );
}
