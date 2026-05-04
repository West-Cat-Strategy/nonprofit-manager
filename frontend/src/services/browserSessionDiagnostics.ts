export type BrowserSessionDiagnosticArea = 'bootstrap' | 'route';
export type BrowserSessionDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface BrowserSessionDiagnosticEvent {
  id: string;
  area: BrowserSessionDiagnosticArea;
  event: string;
  severity: BrowserSessionDiagnosticSeverity;
  message: string;
  path: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

const STORAGE_KEY = 'operator_browser_session_diagnostics';
const MAX_EVENTS = 25;

const isDiagnosticEvent = (value: unknown): value is BrowserSessionDiagnosticEvent => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.area === 'string' &&
    typeof candidate.event === 'string' &&
    typeof candidate.severity === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.createdAt === 'string'
  );
};

const safeRead = (): BrowserSessionDiagnosticEvent[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isDiagnosticEvent) : [];
  } catch {
    return [];
  }
};

const safeWrite = (events: BrowserSessionDiagnosticEvent[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Diagnostics must not interrupt startup or error recovery.
  }
};

const currentPath = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const buildId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const recordBrowserSessionDiagnostic = (
  input: Omit<BrowserSessionDiagnosticEvent, 'id' | 'createdAt' | 'path'> & { path?: string }
): BrowserSessionDiagnosticEvent => {
  const event: BrowserSessionDiagnosticEvent = {
    id: buildId(),
    area: input.area,
    event: input.event,
    severity: input.severity,
    message: input.message,
    path: input.path ?? currentPath(),
    createdAt: new Date().toISOString(),
    details: input.details,
  };

  safeWrite([...safeRead(), event]);
  return event;
};

export const getBrowserSessionDiagnostics = (): BrowserSessionDiagnosticEvent[] => safeRead();

export const clearBrowserSessionDiagnostics = (): void => safeWrite([]);

export const formatBrowserSessionDiagnostics = (): string =>
  JSON.stringify(getBrowserSessionDiagnostics(), null, 2);
