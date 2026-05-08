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

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
};

const redactPathname = (pathname: string): string => {
  const segments = pathname.split('/');
  return segments
    .map((segment, index) => {
      if (!segment) return segment;
      const decodedSegment = safeDecode(segment).toLowerCase();
      const previousSegment = safeDecode(segments[index - 1] || '').toLowerCase();
      if (SENSITIVE_PATH_MARKERS.has(previousSegment) || TOKEN_LIKE_SEGMENT.test(segment)) {
        return REDACTED;
      }
      if (decodedSegment.includes('token=') || decodedSegment.includes('secret=')) {
        return REDACTED;
      }
      return segment;
    })
    .join('/');
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const redactHash = (hash: string): string => {
  if (!hash) return '';
  const withoutMarker = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!withoutMarker) return hash;

  try {
    const params = new URLSearchParams(withoutMarker);
    let redacted = false;
    params.forEach((_value, key) => {
      if (isSensitiveKey(key)) {
        params.set(key, REDACTED);
        redacted = true;
      }
    });
    return redacted ? `#${params.toString()}` : hash;
  } catch {
    return isSensitiveKey(withoutMarker) || TOKEN_LIKE_SEGMENT.test(withoutMarker)
      ? `#${REDACTED}`
      : hash;
  }
};

const fallbackRedact = (value: string): string =>
  value
    .replace(
      /([?&#;](?:[^=&#;]*?(?:token|secret|password|signature|csrf|auth|key|code|session|jwt|stripe|whsec)[^=&#;]*?)=)[^&#;\s]*/gi,
      `$1${REDACTED}`
    )
    .replace(TOKEN_LIKE_SEGMENT, REDACTED);

export const redactUrlForLogs = (value: string | undefined): string => {
  if (!value) return '';

  try {
    const parsed = new URL(value, 'http://nonprofit-manager.local');
    const params = parsed.searchParams;
    params.forEach((_paramValue, key) => {
      if (isSensitiveKey(key)) {
        params.set(key, REDACTED);
      }
    });

    return `${redactPathname(parsed.pathname)}${params.toString() ? `?${params.toString()}` : ''}${redactHash(
      parsed.hash
    )}`;
  } catch {
    return fallbackRedact(value);
  }
};
