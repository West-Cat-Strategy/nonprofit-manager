import { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

interface ModuleCardProps {
  to: string;
  title: string;
  description: string;
  stat?: string;
  accentColor: string;
}

const ModuleCard = memo(function ModuleCard({ to, title, description, stat, accentColor }: ModuleCardProps) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
      aria-label={`${title} - ${description}${stat ? `. ${stat}` : ''}`}
    >
      <div className={`absolute -right-10 -top-10 h-24 w-24 rounded-full ${accentColor}`} aria-hidden="true" />
      <div className="relative">
        <h3 className="text-lg font-semibold text-app-text">{title}</h3>
        <p className="mt-1 text-sm text-app-text-muted">{description}</p>
        {stat && <p className="mt-3 text-xs text-app-text-muted">{stat}</p>}
      </div>
    </Link>
  );
});

interface AnalyticsSummary {
  active_accounts: number;
  active_contacts: number;
  total_volunteers: number;
  total_events_ytd: number;
  total_donations_ytd: number;
}

interface ModulesGridProps {
  summary: AnalyticsSummary | null;
  activeCasesCount: number;
}

function ModulesGrid({ summary, activeCasesCount }: ModulesGridProps) {
  const modules = [
    {
      to: '/accounts',
      title: 'Accounts',
      description: 'Manage organizations and households',
      stat: summary ? `${summary.active_accounts} active accounts` : undefined,
      accentColor: 'bg-amber-200/50',
    },
    {
      to: '/contacts',
      title: 'People',
      description: 'Keep constituent profiles updated',
      stat: summary ? `${summary.active_contacts} active people` : undefined,
      accentColor: 'bg-teal-200/50',
    },
    {
      to: '/volunteers',
      title: 'Volunteers',
      description: 'Coordinate volunteer programs',
      stat: summary ? `${summary.total_volunteers} volunteers` : undefined,
      accentColor: 'bg-sky-200/50',
    },
    {
      to: '/events',
      title: 'Events',
      description: 'Plan and track event operations',
      stat: summary ? `${summary.total_events_ytd} events this year` : undefined,
      accentColor: 'bg-emerald-200/50',
    },
    {
      to: '/donations',
      title: 'Donations',
      description: 'Track giving and stewardship',
      stat: summary ? `${formatCurrency(summary.total_donations_ytd)} YTD` : undefined,
      accentColor: 'bg-violet-200/50',
    },
    {
      to: '/tasks',
      title: 'Tasks',
      description: 'Stay on top of team to-dos',
      accentColor: 'bg-rose-200/50',
    },
    {
      to: '/cases',
      title: 'Cases',
      description: 'Track client cases and follow-ups',
      stat: `${activeCasesCount} active cases`,
      accentColor: 'bg-red-200/50',
    },
    {
      to: '/analytics',
      title: 'Reports',
      description: 'Dig into trends and insights',
      accentColor: 'bg-indigo-200/50',
    },
  ];

  return (
    <section className="mt-6 rounded-2xl border border-app-border/70 bg-app-surface/85 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-app-text">Modules</h2>
          <p className="text-sm text-app-text-muted">Jump into the workstreams you manage most.</p>
        </div>
      </div>
      <nav className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Application modules">
        {modules.map((module) => (
          <ModuleCard key={module.to} {...module} />
        ))}
      </nav>
    </section>
  );
}

export default memo(ModulesGrid);
