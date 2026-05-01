import { Link } from 'react-router-dom';
import type { AdminStats } from '../../../api/adminHubApiClient';
import type { AdminWorkspaceStatusCard } from '../../../contracts';

interface DashboardSectionProps {
  stats: AdminStats | null;
  cards: AdminWorkspaceStatusCard[];
  loading: boolean;
  onShowInvite: () => void;
  onRefresh: () => void;
}

const toneClassName: Record<AdminWorkspaceStatusCard['tone'], string> = {
  neutral: 'border-app-border bg-app-surface',
  positive: 'border-app-border bg-app-accent-soft',
  warning: 'border-app-border bg-app-accent-soft',
};

export default function DashboardSection({
  stats,
  cards,
  loading,
  onShowInvite,
  onRefresh,
}: DashboardSectionProps) {
  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-app-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-text-label">
              Admin Hub
            </p>
            <h2 className="text-2xl font-semibold text-app-text-heading">
              One workspace for organization settings and adjacent admin tools
            </h2>
            <p className="max-w-3xl text-sm text-app-text-muted">
              Use the hub for core organization controls, then jump into specialist workspaces like
              API & Webhooks, Communications, Portal Ops, Navigation, and Backup without losing the
              shared admin context.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onShowInvite}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
            >
              Invite User
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-lg border border-app-border px-4 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} />
        <StatCard title="Active Users (30d)" value={stats?.activeUsers ?? 0} />
        <StatCard title="Total Contacts" value={stats?.totalContacts ?? 0} />
        <StatCard
          title="Recent Donations (30d)"
          value={`$${(stats?.recentDonations ?? 0).toLocaleString()}`}
        />
      </section>

      <section className="rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h3 className="text-lg font-semibold text-app-text-heading">Workspace Status</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Snapshot of the core hub sections and the specialist admin workspaces that stay
            module-owned.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.id}
              to={card.to}
              className={`rounded-lg border p-4 transition-colors hover:border-app-accent hover:bg-app-surface-muted ${toneClassName[card.tone]}`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {card.icon}
                  </span>
                  <div>
                    <h4 className="text-base font-semibold text-app-text-heading">{card.title}</h4>
                    <p className="text-sm text-app-text-muted">{card.description}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-app-text-label">
                  Open
                </span>
              </div>
              <p className="text-sm font-medium text-app-text">{card.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
          <h3 className="text-lg font-semibold text-app-text-heading">Recent Signups</h3>
          <p className="mt-1 text-sm text-app-text-muted">
            Quick view of the newest staff accounts entering the system.
          </p>
        </div>
        <div className="overflow-x-auto p-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-app-border">
                <th className="pb-3 text-sm font-semibold text-app-text-heading">Email</th>
                <th className="pb-3 text-sm font-semibold text-app-text-heading">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentSignups ?? []).map((user) => (
                <tr key={user.id} className="border-b border-app-border last:border-b-0">
                  <td className="py-3 text-sm text-app-text">{user.email}</td>
                  <td className="py-3 text-sm text-app-text-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(stats?.recentSignups ?? []).length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-sm text-app-text-muted">
                    No recent signups found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
      <p className="text-sm font-medium text-app-text-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-app-text-heading">{value}</p>
    </div>
  );
}
