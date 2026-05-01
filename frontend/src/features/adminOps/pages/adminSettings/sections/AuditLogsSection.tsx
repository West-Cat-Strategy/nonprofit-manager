import { useCallback, useEffect, useState } from 'react';
import api from '../../../../../services/api';
import { useApiError } from '../../../../../hooks/useApiError';
import type { AuditLogPage } from '../types';

export default function AuditLogsSection() {
  const [auditLogPage, setAuditLogPage] = useState<AuditLogPage>({ logs: [], total: 0 });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const { setFromError } = useApiError({ notify: true });
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await api.get(`/admin/audit-logs?limit=${limit}&offset=${page * limit}`);
      setAuditLogPage(response.data || { logs: [], total: 0 });
    } catch (error) {
      setFetchError('Failed to load audit logs');
      setFromError(error, 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, setFromError]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(auditLogPage.total / limit));
  const latestVisibleEvent = auditLogPage.logs[0] ?? null;
  const isEmpty = !loading && auditLogPage.logs.length === 0;
  const hasDisabledState = isEmpty && Boolean(auditLogPage.warning);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black uppercase">Audit Logs</h2>
          <p className="text-sm text-[var(--app-text-muted)]">
            Unified view of system changes, account updates, and admin activity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLogs()}
          disabled={loading}
          className="rounded border border-app-border bg-app-surface px-3 py-2 text-xs font-bold uppercase disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3">
          <p className="text-xs font-bold uppercase text-[var(--app-text-muted)]">Total events</p>
          <p className="mt-2 text-2xl font-black text-app-text">{auditLogPage.total}</p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
            Matching events from the current response.
          </p>
        </div>
        <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3 md:col-span-2">
          <p className="text-xs font-bold uppercase text-[var(--app-text-muted)]">
            Latest visible event
          </p>
          {latestVisibleEvent ? (
            <>
              <p className="mt-2 font-semibold text-app-text">{latestVisibleEvent.summary}</p>
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                {new Date(latestVisibleEvent.changedAt).toLocaleString()} by{' '}
                {latestVisibleEvent.changedByEmail || 'System'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
              No visible events on this page.
            </p>
          )}
        </div>
      </div>

      {auditLogPage.warning && (
        <div className="rounded border border-app-border bg-app-accent-soft px-3 py-2 text-sm font-medium text-app-accent-text">
          Backend warning: {auditLogPage.warning}
        </div>
      )}

      {fetchError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-app-border bg-app-surface px-4 py-3">
          <p className="text-sm font-medium text-app-accent-text">{fetchError}</p>
          <button
            type="button"
            onClick={() => void fetchLogs()}
            className="rounded border border-app-border bg-app-surface-muted px-3 py-1 text-xs font-bold uppercase"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-app-surface-muted">
              <tr className="border-b border-app-border">
                <th className="p-3 font-bold uppercase w-44">Date</th>
                <th className="p-3 font-bold uppercase w-44">Actor</th>
                <th className="p-3 font-bold uppercase w-32">Event</th>
                <th className="p-3 font-bold uppercase w-36">Target</th>
                <th className="p-3 font-bold uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {auditLogPage.logs.map((log) => (
                <tr key={log.id} className="hover:bg-app-surface-muted transition-colors">
                  <td className="p-3 text-[var(--app-text-muted)]">
                    <div>{new Date(log.changedAt).toLocaleString()}</div>
                    <div className="mt-1 text-xs text-[var(--app-text-subtle)]">
                      {log.clientIpAddress || 'IP unavailable'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-app-text">
                      {log.changedByEmail || 'System'}
                    </div>
                    {log.userAgent && (
                      <div className="mt-1 text-xs text-[var(--app-text-subtle)]">
                        {log.userAgent}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full border border-app-border px-2 py-0.5 text-xs font-bold uppercase ${
                        log.operation === 'DELETE'
                          ? 'bg-app-accent-soft text-app-accent-text'
                          : log.operation === 'INSERT'
                            ? 'bg-app-accent-soft text-app-accent-text'
                            : 'bg-app-surface-muted text-app-text'
                      }`}
                    >
                      {log.operation}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-[var(--app-text-muted)]">
                    {log.tableName}
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-app-text">{log.summary}</div>
                    <div className="mt-1 text-sm text-[var(--app-text-muted)]">{log.details}</div>
                    {log.changedFields && log.changedFields.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {log.changedFields.map((field) => (
                          <span
                            key={field}
                            className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-[var(--loop-blue)]" />
                  </td>
                </tr>
              )}
              {isEmpty && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-[var(--app-text-muted)] font-medium"
                  >
                    {hasDisabledState
                      ? 'Audit logging is disabled or unavailable for this response.'
                      : 'No audit logs found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-app-border bg-app-surface-muted p-4">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            className="rounded border border-app-border bg-app-surface px-3 py-1 text-sm font-bold uppercase disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs font-bold uppercase text-[var(--app-text-muted)]">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={(page + 1) * limit >= auditLogPage.total}
            onClick={() => setPage((current) => current + 1)}
            className="rounded border border-app-border bg-app-surface px-3 py-1 text-sm font-bold uppercase disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
