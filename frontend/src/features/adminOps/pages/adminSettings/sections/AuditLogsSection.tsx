import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import api from '../../../../../services/api';
import { useApiError } from '../../../../../hooks/useApiError';
import type { AuditLog, AuditLogPage } from '../types';
import BrowserSessionDiagnosticsPanel from '../components/BrowserSessionDiagnosticsPanel';
import AdminModalShell from '../components/AdminModalShell';


const auditLogHeaderClasses: Record<string, string> = {
  changedAt: 'w-44',
  changedByEmail: 'w-44',
  operation: 'w-32',
  tableName: 'w-36',
  summary: 'min-w-80',
};

const auditLogCellClasses: Record<string, string> = {
  changedAt: 'align-top text-[var(--app-text-muted)]',
  changedByEmail: 'align-top',
  operation: 'align-top',
  tableName: 'align-top font-mono text-xs text-[var(--app-text-muted)]',
  summary: 'align-top',
};

const formatDiffValue = (val: unknown): string => {
  if (val === undefined || val === null) {
    return '—';
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
};

export default function AuditLogsSection() {
  const [auditLogPage, setAuditLogPage] = useState<AuditLogPage>({ logs: [], total: 0 });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [inspectedLog, setInspectedLog] = useState<AuditLog | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'diff' | 'json'>('diff');
  const [showUnchanged, setShowUnchanged] = useState(false);
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
  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: 'changedAt',
        header: 'Date',
        cell: ({ row }) => (
          <>
            <div>{new Date(row.original.changedAt).toLocaleString()}</div>
            <div className="mt-1 text-xs text-[var(--app-text-subtle)]">
              {row.original.clientIpAddress || 'IP unavailable'}
            </div>
          </>
        ),
      },
      {
        accessorKey: 'changedByEmail',
        header: 'Actor',
        cell: ({ row }) => (
          <>
            <div className="font-medium text-app-text">
              {row.original.changedByEmail || 'System'}
            </div>
            {row.original.userAgent && (
              <div
                className="mt-1 max-w-56 overflow-hidden break-words text-xs text-[var(--app-text-subtle)]"
                data-testid="audit-log-user-agent"
              >
                {row.original.userAgent}
              </div>
            )}
          </>
        ),
      },
      {
        accessorKey: 'operation',
        header: 'Event',
        cell: ({ row }) => (
          <span
            className={`inline-flex rounded-full border border-app-border px-2 py-0.5 text-xs font-bold uppercase ${
              row.original.operation === 'DELETE'
                ? 'bg-app-accent-soft text-app-accent-text'
                : row.original.operation === 'INSERT'
                  ? 'bg-app-accent-soft text-app-accent-text'
                  : 'bg-app-surface-muted text-app-text'
            }`}
          >
            {row.original.operation}
          </span>
        ),
      },
      {
        accessorKey: 'tableName',
        header: 'Target',
      },
      {
        accessorKey: 'summary',
        header: 'Details',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[44rem]">
            <div className="break-words font-medium text-app-text">{row.original.summary}</div>
            <div
              className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--app-text-muted)]"
              data-testid="audit-log-details"
            >
              {row.original.details}
            </div>
            {row.original.changedFields && row.original.changedFields.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {row.original.changedFields.map((field) => (
                  <span
                    key={field}
                    className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted"
                  >
                    {field}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  setInspectedLog(row.original);
                  setDiffViewMode('diff');
                  setShowUnchanged(false);
                }}
                aria-label={`Inspect changes for ${row.original.summary}`}
                className="inline-flex items-center text-xs font-bold text-app-accent hover:underline"
              >
                Inspect changes →
              </button>
            </div>
          </div>
        ),

      },
    ],
    []
  );
  // TanStack Table is intentionally piloted on this dense admin grid.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: auditLogPage.logs,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: auditLogPage.total,
  });

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

      <BrowserSessionDiagnosticsPanel />

      <div className="rounded-lg border border-app-border bg-app-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[72rem] table-fixed text-left text-sm">
            <thead className="bg-app-surface-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-app-border">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`p-3 font-bold uppercase ${
                        auditLogHeaderClasses[header.column.id] ?? ''
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-app-border">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-app-surface-muted transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`p-3 ${auditLogCellClasses[cell.column.id] ?? ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
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

      {inspectedLog && (
        <AdminModalShell
          title={
            <div className="flex items-center gap-2">
              <span>Audit Log Inspection</span>
              <span
                className={`inline-flex rounded-full border border-app-border px-2 py-0.5 text-xs font-bold uppercase ${
                  inspectedLog.operation === 'DELETE'
                    ? 'bg-rose-100 text-rose-800'
                    : inspectedLog.operation === 'INSERT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-app-surface-muted text-app-text'
                }`}
              >
                {inspectedLog.operation}
              </span>
            </div>
          }
          description={
            <span>
              Table: <span className="font-mono text-xs font-bold text-app-text">{inspectedLog.tableName}</span> • Record: <span className="font-mono text-xs font-bold text-app-text">{inspectedLog.recordId}</span>
            </span>
          }
          closeLabel="Close audit log inspection"
          onClose={() => setInspectedLog(null)}
          sizeClassName="max-w-4xl"
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="rounded border border-app-border bg-app-surface px-4 py-2 text-xs font-bold uppercase hover:bg-app-surface-muted"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4" data-testid="audit-log-inspect-modal">
            {/* Metadata summary */}
            <div className="grid gap-2 sm:grid-cols-2 rounded-lg border border-app-border bg-app-surface-muted p-3 text-xs">
              <div>
                <span className="font-bold text-[var(--app-text-muted)]">Changed At: </span>
                <span className="text-app-text">{new Date(inspectedLog.changedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="font-bold text-[var(--app-text-muted)]">Actor: </span>
                <span className="text-app-text">{inspectedLog.changedByEmail || 'System'}</span>
              </div>
              <div>
                <span className="font-bold text-[var(--app-text-muted)]">Client IP: </span>
                <span className="text-app-text">{inspectedLog.clientIpAddress || 'IP unavailable'}</span>
              </div>
              <div>
                <span className="font-bold text-[var(--app-text-muted)]">User Agent: </span>
                <span className="text-app-text truncate">{inspectedLog.userAgent || 'None'}</span>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex items-center justify-between border-b border-app-border pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDiffViewMode('diff')}
                  className={`rounded border px-3 py-1 text-xs font-bold uppercase transition ${
                    diffViewMode === 'diff'
                      ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                      : 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted'
                  }`}
                >
                  Visual Diff
                </button>
                <button
                  type="button"
                  onClick={() => setDiffViewMode('json')}
                  className={`rounded border px-3 py-1 text-xs font-bold uppercase transition ${
                    diffViewMode === 'json'
                      ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                      : 'border-app-border bg-app-surface text-app-text hover:bg-app-surface-muted'
                  }`}
                >
                  Raw JSON
                </button>
              </div>

              {diffViewMode === 'diff' && (
                <button
                  type="button"
                  onClick={() => setShowUnchanged(!showUnchanged)}
                  className="text-xs font-semibold text-app-text-muted hover:text-app-text"
                >
                  {showUnchanged ? 'Hide Unchanged Fields' : 'Show All Fields'}
                </button>
              )}
            </div>

            {/* Content view */}
            {diffViewMode === 'diff' ? (
              (() => {
                const oldVals = (inspectedLog.oldValues as Record<string, unknown>) || {};
                const newVals = (inspectedLog.newValues as Record<string, unknown>) || {};
                const allKeys = Array.from(new Set([...Object.keys(oldVals), ...Object.keys(newVals)]));

                if (allKeys.length === 0) {
                  return (
                    <div className="rounded border border-app-border bg-app-surface p-6 text-center text-sm text-[var(--app-text-muted)]">
                      No structured key-value state recorded for this entry.
                      {inspectedLog.details && (
                        <p className="mt-2 text-xs font-mono">{inspectedLog.details}</p>
                      )}
                    </div>
                  );
                }

                const filteredKeys = showUnchanged
                  ? allKeys
                  : allKeys.filter((k) => JSON.stringify(oldVals[k]) !== JSON.stringify(newVals[k]));

                if (filteredKeys.length === 0) {
                  return (
                    <div className="rounded border border-app-border bg-app-surface p-6 text-center text-sm text-[var(--app-text-muted)]">
                      All {allKeys.length} fields are identical between before and after states.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredKeys.map((key) => {
                      const oldVal = oldVals[key];
                      const newVal = newVals[key];
                      const isModified = JSON.stringify(oldVal) !== JSON.stringify(newVal);
                      const isAdded = oldVal === undefined && newVal !== undefined;
                      const isRemoved = oldVal !== undefined && newVal === undefined;

                      return (
                        <div
                          key={key}
                          className="rounded border border-app-border bg-app-surface p-3 text-xs"
                          data-testid={`diff-field-${key}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono font-bold text-app-text">{key}</span>
                            <span
                              className={`rounded px-2 py-0.5 font-bold uppercase text-[10px] ${
                                isAdded
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRemoved
                                    ? 'bg-rose-100 text-rose-800'
                                    : isModified
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-app-surface-muted text-app-text-muted'
                              }`}
                            >
                              {isAdded ? 'Added' : isRemoved ? 'Removed' : isModified ? 'Modified' : 'Unchanged'}
                            </span>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded border border-rose-200 bg-rose-50/60 p-2 text-rose-900">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-1">
                                Before
                              </span>
                              <span className="font-mono break-all">{formatDiffValue(oldVal)}</span>
                            </div>
                            <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2 text-emerald-900">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
                                After
                              </span>
                              <span className="font-mono break-all">{formatDiffValue(newVal)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="block font-bold uppercase text-[var(--app-text-muted)] mb-1">
                    Old Values
                  </span>
                  <pre className="max-h-64 overflow-auto rounded border border-app-border bg-app-surface-muted p-3 font-mono text-[11px]">
                    {JSON.stringify(inspectedLog.oldValues, null, 2) || 'null'}
                  </pre>
                </div>
                <div>
                  <span className="block font-bold uppercase text-[var(--app-text-muted)] mb-1">
                    New Values
                  </span>
                  <pre className="max-h-64 overflow-auto rounded border border-app-border bg-app-surface-muted p-3 font-mono text-[11px]">
                    {JSON.stringify(inspectedLog.newValues, null, 2) || 'null'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </AdminModalShell>
      )}
    </div>
  );
}

