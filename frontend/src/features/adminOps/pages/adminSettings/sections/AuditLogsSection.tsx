import { useEffect, useState } from 'react';
import api from '../../../../../services/api';
import { useApiError } from '../../../../../hooks/useApiError';
import type { AuditLogPage } from '../types';

export default function AuditLogsSection() {
  const [auditLogPage, setAuditLogPage] = useState<AuditLogPage>({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const { setFromError } = useApiError({ notify: true });
  const limit = 20;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `/admin/audit-logs?limit=${limit}&offset=${page * limit}`
        );
        setAuditLogPage(response.data || { logs: [], total: 0 });
      } catch (error) {
        setFromError(error, 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    void fetchLogs();
  }, [page, setFromError]);

  const totalPages = Math.max(1, Math.ceil(auditLogPage.total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black uppercase">Audit Logs</h2>
          <p className="text-sm text-[var(--app-text-muted)]">
            Unified view of system changes, account updates, and admin activity.
          </p>
        </div>
        {auditLogPage.warning && (
          <span className="px-3 py-1 bg-app-accent-soft text-app-accent-text border border-app-border text-xs font-bold uppercase">
            {auditLogPage.warning}
          </span>
        )}
      </div>

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
                    <div className="mt-1 text-sm text-[var(--app-text-muted)]">
                      {log.details}
                    </div>
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
              {!loading && auditLogPage.logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-[var(--app-text-muted)] font-medium"
                  >
                    No audit logs found
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
