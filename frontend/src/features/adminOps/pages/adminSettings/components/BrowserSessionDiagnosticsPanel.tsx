import { useCallback, useMemo, useState } from 'react';
import {
  clearBrowserSessionDiagnostics,
  formatBrowserSessionDiagnostics,
  getBrowserSessionDiagnostics,
  type BrowserSessionDiagnosticArea,
  type BrowserSessionDiagnosticEvent,
  type BrowserSessionDiagnosticSeverity,
} from '../../../../../services/browserSessionDiagnostics';

const severityClasses: Record<BrowserSessionDiagnosticSeverity, string> = {
  info: 'bg-app-surface-muted text-app-text',
  warning: 'bg-app-accent-soft text-app-accent-text',
  error: 'bg-app-accent-soft text-app-accent-text',
};

const areaLabels: Record<BrowserSessionDiagnosticArea, string> = {
  bootstrap: 'Bootstrap',
  route: 'Route',
};

const countByArea = (
  events: BrowserSessionDiagnosticEvent[],
  area: BrowserSessionDiagnosticArea
): number => events.filter((event) => event.area === area).length;

export default function BrowserSessionDiagnosticsPanel() {
  const [events, setEvents] = useState<BrowserSessionDiagnosticEvent[]>(() =>
    getBrowserSessionDiagnostics()
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const latestEvents = useMemo(() => [...events].reverse().slice(0, 5), [events]);

  const refreshEvents = useCallback(() => {
    setEvents(getBrowserSessionDiagnostics());
  }, []);

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      setStatusMessage('Clipboard is unavailable in this browser session.');
      return;
    }

    try {
      await navigator.clipboard.writeText(formatBrowserSessionDiagnostics());
      setStatusMessage('Diagnostics copied.');
      refreshEvents();
    } catch {
      setStatusMessage('Diagnostics could not be copied in this browser session.');
    }
  };

  const handleClear = () => {
    clearBrowserSessionDiagnostics();
    setEvents([]);
    setStatusMessage('Diagnostics cleared.');
  };

  return (
    <section className="rounded-lg border border-app-border bg-app-surface px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--app-text-muted)]">
            Browser session diagnostics
          </p>
          <h3 className="mt-1 text-lg font-black text-app-text">Current tab diagnostics</h3>
          <p className="mt-1 max-w-3xl text-sm text-[var(--app-text-muted)]">
            Client-side startup and route recovery events captured in this browser tab for support
            handoff.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshEvents}
            className="rounded border border-app-border bg-app-surface-muted px-3 py-2 text-xs font-bold uppercase text-app-text"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={events.length === 0}
            className="rounded border border-app-border bg-app-surface px-3 py-2 text-xs font-bold uppercase text-app-text disabled:opacity-50"
          >
            Copy diagnostics
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={events.length === 0}
            className="rounded border border-app-border bg-app-surface px-3 py-2 text-xs font-bold uppercase text-app-text disabled:opacity-50"
          >
            Clear diagnostics
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded border border-app-border bg-app-surface-muted px-3 py-3">
          <p className="text-xs font-bold uppercase text-[var(--app-text-muted)]">Captured</p>
          <p className="mt-1 text-2xl font-black text-app-text">{events.length}</p>
        </div>
        <div className="rounded border border-app-border bg-app-surface-muted px-3 py-3">
          <p className="text-xs font-bold uppercase text-[var(--app-text-muted)]">Bootstrap</p>
          <p className="mt-1 text-2xl font-black text-app-text">
            {countByArea(events, 'bootstrap')}
          </p>
        </div>
        <div className="rounded border border-app-border bg-app-surface-muted px-3 py-3">
          <p className="text-xs font-bold uppercase text-[var(--app-text-muted)]">Route</p>
          <p className="mt-1 text-2xl font-black text-app-text">{countByArea(events, 'route')}</p>
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-3 text-sm font-medium text-app-text-muted" role="status">
          {statusMessage}
        </p>
      ) : null}

      {latestEvents.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {latestEvents.map((event) => (
            <li key={event.id} className="rounded border border-app-border bg-app-surface-muted p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-xs font-bold uppercase text-app-text">
                  {areaLabels[event.area]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${severityClasses[event.severity]}`}
                >
                  {event.severity}
                </span>
                <span className="text-xs text-[var(--app-text-muted)]">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 font-semibold text-app-text">{event.message}</p>
              <p className="mt-1 break-words font-mono text-xs text-[var(--app-text-muted)]">
                {event.event} at {event.path || '/'}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded border border-dashed border-app-border bg-app-surface-muted px-3 py-3 text-sm font-medium text-[var(--app-text-muted)]">
          No browser-session diagnostics captured in this tab.
        </p>
      )}
    </section>
  );
}
