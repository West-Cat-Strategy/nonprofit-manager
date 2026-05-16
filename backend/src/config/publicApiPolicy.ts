const apiV2 = (path: string): string => `/api/v2${path}`;

export const PUBLIC_API_V2_MOUNT_PATHS = [
  '/auth',
  '/public/communications',
  '/public/events',
  '/public/newsletters',
  '/public/content',
  '/public/forms',
  '/public/actions',
  '/public/case-forms',
  '/public/reports',
  '/portal/auth',
] as const;

export const PUBLIC_SITE_API_V2_MOUNT_PATHS = [
  '/public/communications',
  '/public/events',
  '/public/newsletters',
  '/public/content',
  '/public/forms',
  '/public/actions',
  '/public/case-forms',
  '/public/reports',
] as const;

export const PUBLIC_SITE_API_PATH_PREFIXES = PUBLIC_SITE_API_V2_MOUNT_PATHS.map(apiV2);

const csrfAuthSkipPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/setup',
  '/api/auth/setup-status',
  '/api/auth/passkeys/login/options',
  '/api/auth/passkeys/login/verify',
  '/api/portal/auth/login',
  '/api/portal/auth/signup',
  '/api/portal/auth/register',
  '/api/payments/webhook',
  '/api/v2/auth/login',
  '/api/v2/auth/register',
  '/api/v2/auth/setup',
  '/api/v2/auth/setup-status',
  '/api/v2/auth/passkeys/login/options',
  '/api/v2/auth/passkeys/login/verify',
  '/api/v2/portal/auth/login',
  '/api/v2/portal/auth/signup',
  '/api/v2/portal/auth/register',
  '/api/v2/payments/webhook',
] as const;

const csrfPublicTokenSkipPaths = [
  '/api/v2/public/communications/unsubscribe',
  '/api/v2/public/newsletters/confirm',
] as const;

export const CSRF_SKIP_PATH_PREFIXES = [
  ...csrfAuthSkipPaths,
  ...csrfPublicTokenSkipPaths,
  '/health',
  '/metrics',
] as const;

export const PUBLIC_SITE_TRACK_PATH_PATTERN = /^\/api\/v2\/sites\/[^/]+\/track$/;

export const isPublicSiteApiPath = (path: string): boolean =>
  PUBLIC_SITE_API_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)) ||
  PUBLIC_SITE_TRACK_PATH_PATTERN.test(path);

const matchesPathPrefix = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}/`);

export const isCsrfSkipPath = (path: string, fullPath = path): boolean =>
  CSRF_SKIP_PATH_PREFIXES.some(
    (skipPath) => matchesPathPrefix(path, skipPath) || matchesPathPrefix(fullPath, skipPath)
  );
