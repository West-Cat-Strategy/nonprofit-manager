import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminSettingsPath } from '../../../adminRoutePaths';
import { listPendingRegistrations } from '../../../api/adminHubApiClient';

export default function PendingApprovalsSummaryCard() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCount = async () => {
      try {
        const response = await listPendingRegistrations('pending');
        if (!cancelled) {
          setCount(response.items.length);
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      }
    };

    void loadCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    count === null
      ? 'Checking pending approvals...'
      : count > 0
        ? `${count} registration request${count === 1 ? '' : 's'} awaiting review`
        : 'No pending registration requests right now';

  return (
    <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
      <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">
            Pending approvals
          </p>
          <h2 className="mt-2 text-lg font-semibold text-app-text-heading">
            Approvals now live in their own workspace
          </h2>
          <p className="mt-1 text-sm text-app-text-muted">{label}</p>
        </div>
        <Link
          to={getAdminSettingsPath('approvals')}
          className="inline-flex items-center justify-center rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition hover:bg-app-accent-hover"
        >
          Open Approvals
        </Link>
      </div>
    </div>
  );
}
