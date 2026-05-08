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
const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PARTS = [
  'access_token',
  'api_key',
  'auth',
  'authorization',
  'client_secret',
  'code',
  'csrf',
  'jwt',
  'key',
  'password',
  'refresh_token',
  'secret',
  'session',
  'signature',
  'stripe',
  'token',
  'whsec',
];

const SENSITIVE_PATH_MARKERS = new Set([
  'confirm',
  'confirmation',
  'invite',
  'invitation',
  'reset-password',
  'secret',
  'token',
  'tokens',
  'unsubscribe',
]);

const TOKEN_LIKE_SEGMENT =
  /^(?:eyJ[A-Za-z0-9_-]{12,}|[A-Za-z0-9_-]{32,}|sk_(?:live|test)_[A-Za-z0-9_]+|pk_(?:live|test)_[A-Za-z0-9_]+|whsec_[A-Za-z0-9_]+)$/;

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
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.map(redactDiagnosticEvent).slice(-MAX_EVENTS))
    );
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

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
};

const redactPathname = (pathname: string): string =>
  pathname
    .split('/')
    .map((segment, index, segments) => {
      if (!segment) return segment;
      const previousSegment = safeDecode(segments[index - 1] || '').toLowerCase();
      if (SENSITIVE_PATH_MARKERS.has(previousSegment) || TOKEN_LIKE_SEGMENT.test(segment)) {
        return REDACTED;
      }
      return segment;
    })
    .join('/');

const redactUrl = (value: string): string => {
  if (!value) return value;

  try {
    const parsed = new URL(value, window.location.origin);
    parsed.searchParams.forEach((_paramValue, key) => {
      if (isSensitiveKey(key)) {
        parsed.searchParams.set(key, REDACTED);
      }
    });
    const hash = parsed.hash ? redactHash(parsed.hash) : '';
    return `${redactPathname(parsed.pathname)}${parsed.search}${hash}`;
  } catch {
    return value.replace(
      /([?&#;](?:[^=&#;]*?(?:token|secret|password|signature|csrf|auth|key|code|session|jwt|stripe|whsec)[^=&#;]*?)=)[^&#;\s]*/gi,
      `$1${REDACTED}`
    );
  }
};

const redactHash = (hash: string): string => {
  const withoutMarker = hash.startsWith('#') ? hash.slice(1) : hash;
  const decoded = safeDecode(withoutMarker);
  if (
    withoutMarker &&
    !/[=&]/.test(withoutMarker) &&
    (isSensitiveKey(decoded) || TOKEN_LIKE_SEGMENT.test(decoded))
  ) {
    return `#${REDACTED}`;
  }

  try {
    const params = new URLSearchParams(withoutMarker);
    let redacted = false;
    params.forEach((_paramValue, key) => {
      if (isSensitiveKey(key)) {
        params.set(key, REDACTED);
        redacted = true;
      }
    });
    if (redacted) {
      return `#${params.toString()}`;
    }
    return TOKEN_LIKE_SEGMENT.test(decoded) ? `#${REDACTED}` : hash;
  } catch {
    return isSensitiveKey(decoded) || TOKEN_LIKE_SEGMENT.test(decoded)
      ? `#${REDACTED}`
      : hash;
  }
};

const redactDiagnosticDetails = (details: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!details) return undefined;

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      if (isSensitiveKey(key)) {
        return [key, REDACTED];
      }
      if (typeof value === 'string') {
        return [key, redactUrl(value)];
      }
      return [key, value];
    })
  );
};

const redactDiagnosticEvent = (
  event: BrowserSessionDiagnosticEvent
): BrowserSessionDiagnosticEvent => ({
  ...event,
  path: redactUrl(event.path),
  details: redactDiagnosticDetails(event.details),
});

export const recordBrowserSessionDiagnostic = (
  input: Omit<BrowserSessionDiagnosticEvent, 'id' | 'createdAt' | 'path'> & { path?: string }
): BrowserSessionDiagnosticEvent => {
  const event: BrowserSessionDiagnosticEvent = {
    id: buildId(),
    area: input.area,
    event: input.event,
    severity: input.severity,
    message: input.message,
    path: redactUrl(input.path ?? currentPath()),
    createdAt: new Date().toISOString(),
    details: redactDiagnosticDetails(input.details),
  };

  safeWrite([...safeRead(), event]);
  return event;
};

export const getBrowserSessionDiagnostics = (): BrowserSessionDiagnosticEvent[] => safeRead();

export const clearBrowserSessionDiagnostics = (): void => safeWrite([]);

export const formatBrowserSessionDiagnostics = (): string =>
  JSON.stringify(getBrowserSessionDiagnostics().map(redactDiagnosticEvent), null, 2);
