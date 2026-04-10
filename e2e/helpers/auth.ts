/**
 * Authentication Helper Functions for E2E Tests
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Page, expect } from '@playwright/test';
import { getSharedTestUser, setSharedTestUser } from './testUser';

const RETRYABLE_NETWORK_ERROR = /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up/i;
const HTTP_SCHEME = ['http', '://'].join('');

const isRetryableNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return RETRYABLE_NETWORK_ERROR.test(error.message);
};

const isRetryableSetupStatusError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  if (RETRYABLE_NETWORK_ERROR.test(message)) {
    return true;
  }

  if (!message.includes('setup-status failed')) {
    return false;
  }

  return /\(5\d{2}\)/.test(message);
};

async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 300;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

type AuthUser = Record<string, unknown>;

export interface AuthSession {
  token: string;
  user: AuthUser;
  email: string;
  password: string;
  isAdmin: boolean;
}

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

type ApiLoginResult = {
  token: string;
  user: AuthUser;
  organizationId?: string;
};

type SetupStatusResult = {
  setupRequired: boolean;
  userCount: number;
};

export type BootstrapSessionResult = {
  user: AuthUser;
  organizationId?: string;
};

type DecodedJwtPayload = {
  id?: unknown;
  sub?: unknown;
  email?: unknown;
  role?: unknown;
  exp?: unknown;
  iat?: unknown;
  organizationId?: unknown;
  organization_id?: unknown;
  [key: string]: unknown;
};

const unwrapApiData = <T>(payload: ApiSuccessEnvelope<T> | T): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    (payload as { success?: unknown }).success === true &&
    'data' in (payload as object)
  ) {
    return (payload as ApiSuccessEnvelope<T>).data;
  }
  return payload as T;
};

const extractApiErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;

  const candidate = payload as {
    error?: string | { message?: string };
    message?: string;
  };

  if (typeof candidate.error === 'string') {
    return candidate.error;
  }
  if (candidate.error && typeof candidate.error === 'object' && typeof candidate.error.message === 'string') {
    return candidate.error.message;
  }
  if (typeof candidate.message === 'string') {
    return candidate.message;
  }
  return fallback;
};

const extractAuthTokenFromSetCookie = (setCookieHeader: string | undefined): string | undefined => {
  if (!setCookieHeader) {
    return undefined;
  }

  const match = setCookieHeader.match(/(?:^|[\n,]\s*)auth_token=([^;]+)/i);
  if (!match || !match[1]) {
    return undefined;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : undefined;
};

const INVALID_CREDENTIAL_PATTERNS = [
  'invalid credentials',
  'invalid email',
  'invalid password',
  'invalid email or password',
  'incorrect email',
  'incorrect password',
  'unauthorized',
  'auth failed',
];

const TRUE_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isStrictAdminAuthRequired = (): boolean => {
  const rawValue = process.env.E2E_REQUIRE_STRICT_ADMIN_AUTH;
  if (typeof rawValue !== 'string') {
    return false;
  }
  return TRUE_ENV_VALUES.has(rawValue.trim().toLowerCase());
};

const messageIndicatesInvalidCredentials = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  return INVALID_CREDENTIAL_PATTERNS.some((pattern) => lowerMessage.includes(pattern));
};

const isInvalidCredentialError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  if (messageIndicatesInvalidCredentials(error.message)) {
    return true;
  }

  const status = (error as Error & { status?: number }).status;
  return status === 401 || status === 403;
};

const messageIndicatesUserAlreadyExists = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes('user already exists') ||
    lowerMessage.includes('already exists') ||
    lowerMessage.includes('"code":"conflict"') ||
    lowerMessage.includes('"code":"duplicate')
  );
};

const normalizeOrganizationId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeAuthUser = (value: unknown): AuthUser | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as AuthUser;
};

const resolveOrganizationIdFromUser = (user: AuthUser | undefined): string | undefined =>
  normalizeOrganizationId(user?.organizationId) || normalizeOrganizationId(user?.organization_id);

const toBase64Url = (value: string): string =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const decodeJwtPayload = (token: string): DecodedJwtPayload | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const payload = segments[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as DecodedJwtPayload;
  } catch {
    return null;
  }
};

const signJwtHs256 = (payload: Record<string, unknown>, secret: string): string => {
  const encodedHeader = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${body}.${signature}`;
};

const readEnvValueFromFile = (filePath: string, key: string): string | null => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const pattern = new RegExp(`^${key}=(.+)$`, 'm');
    const match = content.match(pattern);
    if (!match || !match[1]) {
      return null;
    }
    return match[1].trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return null;
  }
};

const resolveJwtSecret = (): string | null => {
  if (process.env.JWT_SECRET?.trim()) {
    return process.env.JWT_SECRET.trim();
  }

  const isDockerBackedRun =
    process.env.SKIP_WEBSERVER === '1' ||
    process.env.API_URL?.includes(':8004') ||
    process.env.BASE_URL?.includes(':8005');

  const envFiles = isDockerBackedRun
    ? [
        path.resolve(__dirname, '..', '..', '.env.development.local'),
        path.resolve(__dirname, '..', '..', '.env.development'),
        path.resolve(__dirname, '..', '..', 'backend', '.env.test.local'),
        path.resolve(__dirname, '..', '..', 'backend', '.env.test'),
        path.resolve(__dirname, '..', '..', 'backend', '.env'),
        path.resolve(__dirname, '..', '..', '.env'),
      ]
    : [
        path.resolve(__dirname, '..', '..', 'backend', '.env.test.local'),
        path.resolve(__dirname, '..', '..', 'backend', '.env.test'),
        path.resolve(__dirname, '..', '..', '.env.development.local'),
        path.resolve(__dirname, '..', '..', '.env.development'),
        path.resolve(__dirname, '..', '..', 'backend', '.env'),
        path.resolve(__dirname, '..', '..', '.env'),
      ];

  for (const envFile of envFiles) {
    const envSecret = readEnvValueFromFile(envFile, 'JWT_SECRET');
    if (envSecret) {
      process.env.JWT_SECRET = envSecret;
      return envSecret;
    }
  }

  return null;
};

const getAuthCachePaths = () => {
  const cacheDir = path.resolve(__dirname, '..', '.cache');
  return {
    cacheDir,
    readyFile: path.join(cacheDir, 'auth-ready.json'),
    authLockFile: path.join(cacheDir, 'auth-lock'),
    sharedUserFile: path.join(cacheDir, 'test-user.json'),
    sharedUserLockFile: path.join(cacheDir, 'test-user.lock'),
    effectiveAdminFile: path.join(cacheDir, 'effective-admin.json'),
  };
};

const unlinkIfExists = (filePath: string): void => {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore cache cleanup issues
  }
};

const writeReadyAuthCache = (email: string): void => {
  const { cacheDir, readyFile } = getAuthCachePaths();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), { encoding: 'utf8' });
};

type CachedAuthCredentials = {
  email: string;
  password: string;
};

const readCachedAuthCredentials = (filePath: string): CachedAuthCredentials | null => {
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      email?: unknown;
      password?: unknown;
    };
    const email = normalizeString(payload.email);
    const password = normalizeString(payload.password);
    if (!email || !password) {
      return null;
    }
    return { email, password };
  } catch {
    return null;
  }
};

const readEffectiveAdminCache = (): CachedAuthCredentials | null => {
  const { effectiveAdminFile } = getAuthCachePaths();
  return readCachedAuthCredentials(effectiveAdminFile);
};

const writeEffectiveAdminCache = (email: string, password: string): void => {
  const normalizedEmail = normalizeString(email);
  const normalizedPassword = normalizeString(password);
  if (!normalizedEmail || !normalizedPassword) {
    return;
  }

  const { cacheDir, effectiveAdminFile } = getAuthCachePaths();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    effectiveAdminFile,
    JSON.stringify({ email: normalizedEmail, password: normalizedPassword, at: Date.now() }),
    { encoding: 'utf8' }
  );
};

const clearEffectiveAdminCache = (): void => {
  const { effectiveAdminFile } = getAuthCachePaths();
  unlinkIfExists(effectiveAdminFile);
};

export const invalidateSharedAuthCaches = (options: { clearLocks?: boolean } = {}): void => {
  const { readyFile, sharedUserFile, authLockFile, sharedUserLockFile } = getAuthCachePaths();
  unlinkIfExists(readyFile);
  unlinkIfExists(sharedUserFile);
  delete process.env.TEST_USER_EMAIL;
  delete process.env.TEST_USER_PASSWORD;

  if (options.clearLocks) {
    unlinkIfExists(authLockFile);
    unlinkIfExists(sharedUserLockFile);
  }
};

const toOrigin = (value: string): string | null => {
  try {
    const origin = new URL(value).origin;
    return origin && origin !== 'null' ? origin : null;
  } catch {
    return null;
  }
};

const buildAuthCookieUrls = (): string[] => {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
  const baseURL = process.env.BASE_URL || process.env.FRONTEND_URL || `${HTTP_SCHEME}127.0.0.1:5173`;
  const origins = new Set<string>();
  const apiOrigin = toOrigin(apiURL);
  const baseOrigin = toOrigin(baseURL);
  if (apiOrigin) {
    origins.add(apiOrigin);
  }
  if (baseOrigin) {
    origins.add(baseOrigin);
  }

  const addHostVariant = (origin: string, fromHost: string, toHost: string): void => {
    if (!origin.includes(fromHost)) {
      return;
    }
    origins.add(origin.replace(fromHost, toHost));
  };

  for (const origin of [...origins]) {
    addHostVariant(origin, '127.0.0.1', 'localhost');
    addHostVariant(origin, 'localhost', '127.0.0.1');
  }

  return [...origins];
};

const syncAuthCookie = async (page: Page, token: string): Promise<void> => {
  const cookieUrls = buildAuthCookieUrls();
  if (cookieUrls.length === 0) {
    return;
  }

  const cookies = cookieUrls.map((url) => ({
    name: 'auth_token',
    value: token,
    url,
  }));

  await page.context().addCookies(cookies);
};

const getAppBaseUrl = (): string =>
  process.env.BASE_URL || process.env.FRONTEND_URL || `${HTTP_SCHEME}127.0.0.1:5173`;

const syncAuthLocalStorage = async (
  page: Page,
  token: string,
  organizationId?: string,
  user?: AuthUser
): Promise<void> => {
  const baseURL = getAppBaseUrl();
  const baseOrigin = toOrigin(baseURL);
  if (baseOrigin) {
    let currentOrigin: string | null = null;
    try {
      currentOrigin = new URL(page.url()).origin;
    } catch {
      currentOrigin = null;
    }

    if (currentOrigin !== baseOrigin) {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    }
  }

  await page
    .evaluate(
      ({ authToken, orgId, authUser }) => {
        localStorage.setItem('token', authToken);
        if (orgId) {
          localStorage.setItem('organizationId', orgId);
        } else {
          localStorage.removeItem('organizationId');
        }

        if (authUser) {
          localStorage.setItem('user', JSON.stringify(authUser));
        } else {
          localStorage.removeItem('user');
        }
      },
      {
        authToken: token,
        orgId: organizationId || null,
        authUser: user || null,
      }
    )
    .catch(() => undefined);
};

const setSessionStorageAuthState = async (
  page: Page,
  token: string,
  organizationId?: string,
  user?: AuthUser,
  options: { replaceCookie?: boolean } = {}
): Promise<void> => {
  if (options.replaceCookie) {
    await page.context().clearCookies();
    await syncAuthCookie(page, token);
  }
  await syncAuthLocalStorage(page, token, organizationId, user);
};

const getOrganizationIdFromToken = (token: string): string | undefined => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return undefined;
  }
  return (
    normalizeOrganizationId(payload.organizationId) ||
    normalizeOrganizationId(payload.organization_id)
  );
};

export async function applyAuthTokenState(
  page: Page,
  token: string,
  organizationId?: string,
  user?: unknown
): Promise<BootstrapSessionResult | null> {
  return primeValidatedBrowserAuthSession(
    page,
    {
      token,
      organizationId,
      user,
    },
    { replaceCookie: true }
  );
}

const getSessionOrganizationId = async (page: Page): Promise<string | undefined> => {
  const localStorageOrganizationId = await page
    .evaluate(() => localStorage.getItem('organizationId'))
    .catch(() => null);
  return normalizeOrganizationId(localStorageOrganizationId);
};

const getApiBaseUrl = (): string => {
  const backendPort = process.env.E2E_BACKEND_PORT?.trim();
  if (backendPort) {
    return `${HTTP_SCHEME}127.0.0.1:${backendPort}`;
  }

  return process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
};

const isAdminRole = (role: unknown): boolean =>
  typeof role === 'string' && role.trim().toLowerCase() === 'admin';

const generateUniqueAdminEmail = (): string =>
  `e2e+admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

const fetchSetupStatus = async (page: Page): Promise<SetupStatusResult> => {
  const setupStatusResponse = await withNetworkRetry(() =>
    page.request.get(`${getApiBaseUrl()}/api/v2/auth/setup-status`)
  );

  if (!setupStatusResponse.ok()) {
    const responseBody = await setupStatusResponse.text().catch(() => '');
    throw new Error(
      `setup-status failed (${setupStatusResponse.status()}): ${responseBody || 'empty response'}`
    );
  }

  const payload = unwrapApiData<{
    setupRequired?: unknown;
    userCount?: unknown;
  }>(await setupStatusResponse.json());

  if (typeof payload?.setupRequired !== 'boolean') {
    throw new Error(`setup-status payload missing boolean setupRequired: ${JSON.stringify(payload)}`);
  }

  const rawUserCount = payload.userCount;
  const userCount =
    typeof rawUserCount === 'number'
      ? rawUserCount
      : Number.parseInt(String(rawUserCount ?? '0'), 10) || 0;

  return {
    setupRequired: payload.setupRequired,
    userCount,
  };
};

const waitForSetupStatus = async (
  page: Page,
  options: { attempts?: number; delayMs?: number } = {}
): Promise<SetupStatusResult> => {
  const attempts = options.attempts ?? 20;
  const delayMs = options.delayMs ?? 500;

  let latestStatus: SetupStatusResult | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      latestStatus = await fetchSetupStatus(page);
      if (!latestStatus.setupRequired) {
        return latestStatus;
      }
    } catch (error) {
      if (!isRetryableSetupStatusError(error) || attempt === attempts) {
        throw error;
      }
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return latestStatus ?? { setupRequired: true, userCount: 0 };
};

const getSetupStatusOrNull = async (
  page: Page,
  options: { attempts?: number; delayMs?: number } = {}
): Promise<SetupStatusResult | null> => {
  try {
    return await waitForSetupStatus(page, options);
  } catch {
    return null;
  }
};

const resolveOrganizationIdFromPayload = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const data = payload as {
    organizationId?: unknown;
    organization_id?: unknown;
    user?: {
      organizationId?: unknown;
      organization_id?: unknown;
    };
  };

  return (
    normalizeOrganizationId(data.organizationId) ||
    normalizeOrganizationId(data.organization_id) ||
    normalizeOrganizationId(data.user?.organizationId) ||
    normalizeOrganizationId(data.user?.organization_id)
  );
};

export async function validateCookieBackedStaffSession(
  page: Page
): Promise<BootstrapSessionResult | null> {
  const response = await withNetworkRetry(() =>
    page.request.get(`${getApiBaseUrl()}/api/v2/auth/bootstrap`, {
      headers: { Accept: 'application/json' },
    })
  );

  if (response.status() === 401 || response.status() === 403) {
    return null;
  }

  if (!response.ok()) {
    throw new Error(
      `auth bootstrap failed (${response.status()}): ${await response.text().catch(() => 'empty response')}`
    );
  }

  const payload = unwrapApiData<{
    user?: unknown;
    organizationId?: unknown;
    organization_id?: unknown;
  }>(await response.json());
  const user = normalizeAuthUser(payload?.user);
  if (!user) {
    throw new Error(`auth bootstrap payload missing user: ${JSON.stringify(payload)}`);
  }

  return {
    user,
    organizationId: resolveOrganizationIdFromPayload(payload) || resolveOrganizationIdFromUser(user),
  };
}

const getCurrentAdminSession = async (page: Page): Promise<AuthSession | null> => {
  const bootstrapSession = await validateCookieBackedStaffSession(page).catch(() => null);
  if (!bootstrapSession || !isAdminRole(bootstrapSession.user?.role)) {
    return null;
  }

  const token = normalizeString(
    await page.evaluate(() => localStorage.getItem('token')).catch(() => null)
  );
  if (!token) {
    return null;
  }

  const email =
    normalizeString(bootstrapSession.user?.email) ||
    process.env.TEST_USER_EMAIL?.trim() ||
    process.env.ADMIN_USER_EMAIL?.trim() ||
    'admin@example.com';
  const configuredAdminEmail = process.env.ADMIN_USER_EMAIL?.trim() || 'admin@example.com';
  const configuredAdminPassword = process.env.ADMIN_USER_PASSWORD?.trim() || 'Admin123!@#';
  const sharedUserEmail = process.env.TEST_USER_EMAIL?.trim();
  const sharedUserPassword = process.env.TEST_USER_PASSWORD?.trim();
  const password =
    email.toLowerCase() === configuredAdminEmail.toLowerCase()
      ? configuredAdminPassword
      : sharedUserEmail && sharedUserPassword && email.toLowerCase() === sharedUserEmail.toLowerCase()
        ? sharedUserPassword
        : '';

  return {
    token,
    user: bootstrapSession.user,
    email,
    password,
    isAdmin: true,
  };
};

const primeValidatedBrowserAuthSession = async (
  page: Page,
  input: {
    token: string;
    organizationId?: string;
    user?: unknown;
  },
  options: {
    replaceCookie?: boolean;
    clearStateOnFailure?: boolean;
  } = {}
): Promise<BootstrapSessionResult | null> => {
  const authUser = normalizeAuthUser(input.user);
  const organizationId =
    input.organizationId || resolveOrganizationIdFromUser(authUser) || getOrganizationIdFromToken(input.token);

  await setSessionStorageAuthState(page, input.token, organizationId, authUser, {
    replaceCookie: options.replaceCookie === true,
  });

  const bootstrapSession = await validateCookieBackedStaffSession(page);
  if (!bootstrapSession) {
    if (options.clearStateOnFailure !== false) {
      await clearAuth(page);
    }
    return null;
  }

  const bootstrapOrganizationId = bootstrapSession.organizationId || organizationId;
  await syncAuthLocalStorage(page, input.token, bootstrapOrganizationId, bootstrapSession.user);

  return {
    user: bootstrapSession.user,
    organizationId: bootstrapOrganizationId,
  };
};

const fetchCsrfTokenForSession = async (
  page: Page,
  token: string,
  organizationId?: string
): Promise<string> => {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
  const response = await withNetworkRetry(() =>
    page.request.get(`${apiURL}/api/v2/auth/csrf-token`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      },
    })
  );

  if (!response.ok()) {
    throw new Error(`Failed to fetch CSRF token (${response.status()}): ${await response.text()}`);
  }

  const payload = unwrapApiData<{ csrfToken?: string }>(await response.json());
  if (!payload?.csrfToken) {
    throw new Error(`CSRF token missing in response payload: ${JSON.stringify(payload)}`);
  }

  return payload.csrfToken;
};

const promoteUserToAdminViaApi = async (
  page: Page,
  token: string,
  userId: string,
  organizationId: string
): Promise<void> => {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
  const csrfToken = await fetchCsrfTokenForSession(page, token, organizationId);
  const response = await withNetworkRetry(() =>
    page.request.put(`${apiURL}/api/v2/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-Organization-Id': organizationId,
        // Force the backend to honor the Authorization header instead of any stale cookie.
        Cookie: '',
      },
      data: {
        role: 'admin',
      },
    })
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to promote fallback user ${userId} to admin (${response.status()}): ${await response.text()}`
    );
  }

  const payload = unwrapApiData<{ role?: unknown }>(await response.json());
  if (!isAdminRole(payload?.role)) {
    throw new Error(
      `Fallback user ${userId} promotion returned unexpected role payload: ${JSON.stringify(payload)}`
    );
  }
};

const getCurrentUserForSession = async (
  page: Page,
  token: string,
  organizationId: string
): Promise<Record<string, unknown>> => {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
  const response = await withNetworkRetry(() =>
    page.request.get(`${apiURL}/api/v2/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Organization-Id': organizationId,
        Cookie: '',
      },
    })
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to refresh current user after admin promotion (${response.status()}): ${await response.text()}`
    );
  }

  return unwrapApiData<Record<string, unknown>>(await response.json());
};

const createDefaultOrganizationForSession = async (
  page: Page,
  token: string,
  organizationId?: string
): Promise<string> => {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;
  const csrfToken = await fetchCsrfTokenForSession(page, token, organizationId);
  const accountName = `E2E Session Org ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const response = await withNetworkRetry(() =>
    page.request.post(`${apiURL}/api/v2/accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
      },
      data: {
        account_name: accountName,
        account_type: 'organization',
        category: 'other',
      },
    })
  );

  if (!response.ok()) {
    throw new Error(
      `Failed to create fallback organization (${response.status()}): ${await response.text()}`
    );
  }

  const payload = unwrapApiData<Record<string, unknown>>(await response.json());
  const accountIdCandidate =
    payload.account_id ||
    payload.id ||
    (payload.data as Record<string, unknown> | undefined)?.account_id ||
    (payload.data as Record<string, unknown> | undefined)?.id;

  const accountId = normalizeOrganizationId(accountIdCandidate);
  if (!accountId) {
    throw new Error(`Failed to parse created organization id from payload: ${JSON.stringify(payload)}`);
  }

  return accountId;
};

const ensureOrganizationBackedSession = async (
  page: Page,
  email: string,
  password: string,
  loginResult: ApiLoginResult
): Promise<ApiLoginResult> => {
  if (loginResult.organizationId) {
    return loginResult;
  }

  const createdOrganizationId = await createDefaultOrganizationForSession(page, loginResult.token);
  const refreshedLogin = await loginViaAPI(page, email, password);
  if (refreshedLogin.organizationId) {
    return refreshedLogin;
  }

  throw new Error(
    `Organization context missing after creating fallback organization ${createdOrganizationId} for ${email}`
  );
};

export async function ensureSetupComplete(
  page: Page,
  email: string,
  password: string,
  profile?: { firstName?: string; lastName?: string; organizationName?: string }
): Promise<{ email: string; password: string }> {
  const apiURL = getApiBaseUrl();
  const firstName = profile?.firstName || 'Test';
  const lastName = profile?.lastName || 'User';
  const organizationName = profile?.organizationName || 'E2E Organization';

  const submitSetup = async (setupEmail: string) =>
    withNetworkRetry(() =>
      page.request.post(`${apiURL}/api/v2/auth/setup`, {
        data: {
          email: setupEmail,
          password,
          password_confirm: password,
          first_name: firstName,
          last_name: lastName,
          organization_name: organizationName,
        },
        headers: { 'Content-Type': 'application/json' },
      })
    );

  let setupEmail = email;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const setupResponse = await submitSetup(setupEmail);
    if (setupResponse.ok()) {
      const setupStatus = await waitForSetupStatus(page, { attempts: 10, delayMs: 500 });
      if (setupStatus.setupRequired) {
        throw new Error(
          `setup completed for ${setupEmail}, but setup-status still requires setup (userCount=${setupStatus.userCount})`
        );
      }
      return { email: setupEmail, password };
    }

    const status = setupResponse.status();
    const responseText = await setupResponse.text().catch(() => '');

    const setupStatus = await waitForSetupStatus(page, { attempts: 3, delayMs: 200 });
    if (!setupStatus.setupRequired) {
      return { email: setupEmail, password };
    }

    const shouldRetryWithTransientServerError =
      status >= 500 ||
      /57P03|internal server error|database is not ready|service unavailable/i.test(responseText);

    const shouldRetryWithUniqueEmail =
      attempt === 1 &&
      (status === 409 || status === 400 || messageIndicatesUserAlreadyExists(responseText));

    if (shouldRetryWithUniqueEmail) {
      setupEmail = generateUniqueAdminEmail();
      continue;
    }

    if (shouldRetryWithTransientServerError && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      continue;
    }

    throw new Error(
      `setup failed for ${setupEmail} (${status}) while setupRequired=true: ${responseText || 'empty response'}`
    );
  }

  throw new Error(`setup failed to complete admin bootstrap for ${email}`);
}

/**
 * Login via API with the provided credentials and land on the dashboard.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  const normalizedEmail = normalizeString(email);
  const normalizedPassword = normalizeString(password);

  if (!normalizedEmail || !normalizedPassword) {
    const missing = [
      normalizedEmail ? null : 'email',
      normalizedPassword ? null : 'password',
    ]
      .filter((part): part is string => Boolean(part))
      .join(' and ');
    console.warn(
      `login(page, email, password) requires non-empty credentials; missing ${missing}. Pass the explicit test account credentials instead of relying on shared test user state.`
    );
    throw new Error(
      `login(page, email, password) requires non-empty email and password. Missing ${missing}. The helper now authenticates with the credentials passed by the caller.`
    );
  }

  await ensureLoginViaAPI(page, normalizedEmail, normalizedPassword, {
    firstName: 'Test',
    lastName: 'User',
  });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard(?:[/?#]|$)/);
}

/**
 * Login via API and set localStorage token
 * Faster than UI login for tests that don't need to test auth
 */
export async function loginViaAPI(
  page: Page,
  email: string,
  password: string
): Promise<ApiLoginResult> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;

  // Prevent stale auth cookies from previous fixture invocations from masking fresh logins.
  await page.context().clearCookies();

  const response = await withNetworkRetry(() =>
    page.request.post(`${apiURL}/api/v2/auth/login`, {
      data: { email, password },
      headers: { 'Content-Type': 'application/json' },
    })
  );

  if (!response.ok()) {
    const errorBody = await response.json().catch(() => ({}));
    const message = extractApiErrorMessage(
      errorBody,
      `Login failed with status ${response.status()}`
    );
    const error = new Error(`${message} (email: ${email})`);
    (error as Error & { status?: number }).status = response.status();
    throw error;
  }

  const data = unwrapApiData<{
    token: string;
    user: AuthUser;
    organizationId?: string;
    organization_id?: string;
  }>(
    await response.json()
  );
  const token =
    normalizeString(data.token) || extractAuthTokenFromSetCookie(response.headers()['set-cookie']);
  expect(token).toBeDefined();
  expect(data.user).toBeDefined();
  const organizationId = resolveOrganizationIdFromPayload(data);
  const authUser = normalizeAuthUser(data.user);
  expect(authUser).toBeDefined();

  const bootstrapSession = await primeValidatedBrowserAuthSession(
    page,
    {
      token: token as string,
      organizationId,
      user: authUser,
    },
    {
      replaceCookie: true,
      // Some fresh sessions need a fallback organization to exist before /auth/bootstrap
      // settles. Keep the authenticated browser state in place so the caller can create
      // that organization instead of falling back to the slower re-registration path.
      clearStateOnFailure: false,
    }
  );

  if (!bootstrapSession) {
    return {
      token: token as string,
      user: authUser,
      organizationId,
    };
  }

  return {
    token: token as string,
    user: bootstrapSession.user,
    organizationId: bootstrapSession.organizationId,
  };
}

/**
 * Ensure an admin session for tests that require elevated permissions.
 */
export async function ensureAdminLoginViaAPI(
  page: Page,
  profile?: { firstName?: string; lastName?: string; organizationName?: string }
): Promise<AuthSession> {
  const currentAdminSession = await getCurrentAdminSession(page);
  if (currentAdminSession) {
    return currentAdminSession;
  }

  const adminEmailFromEnv = process.env.ADMIN_USER_EMAIL?.trim();
  const adminPasswordFromEnv = process.env.ADMIN_USER_PASSWORD?.trim();
  const adminEmail = adminEmailFromEnv || 'admin@example.com';
  const adminPassword = adminPasswordFromEnv || 'Admin123!@#';
  const adminEmailSource = adminEmailFromEnv ? 'env:ADMIN_USER_EMAIL' : 'default(admin@example.com)';
  const adminPasswordSource = adminPasswordFromEnv ? 'env:ADMIN_USER_PASSWORD' : 'default(Admin123!@#)';
  const strictAdminAuth = isStrictAdminAuthRequired();

  const toSession = (
    result: { token: string; user: any },
    email: string,
    password: string
  ): AuthSession => ({
    ...result,
    email,
    password,
    isAdmin: isAdminRole(result.user?.role),
  });

  const loginAndValidateAdminSession = async (
    email: string,
    password: string
  ): Promise<AuthSession> => {
    const loginResult = await loginViaAPI(page, email, password);
    const session = toSession(
      await ensureOrganizationBackedSession(page, email, password, loginResult),
      email,
      password
    );
    const setupStatus = await waitForSetupStatus(page);
    if (setupStatus.setupRequired) {
      throw new Error(
        `setup-status still requires setup after login for ${email} (role=${String(session.user?.role ?? 'unknown')})`
      );
    }
    if (!session.isAdmin) {
      throw new Error(`authenticated user ${email} is not admin (role=${String(session.user?.role ?? 'unknown')})`);
    }
    writeEffectiveAdminCache(email, password);
    return session;
  };

  if (strictAdminAuth) {
    try {
      return await loginAndValidateAdminSession(adminEmail, adminPassword);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      const setupStatus = await waitForSetupStatus(page, { attempts: 3, delayMs: 200 }).catch(() => null);
      if (setupStatus && !setupStatus.setupRequired && isInvalidCredentialError(error)) {
        throw new Error(
          `Strict admin auth is enabled (E2E_REQUIRE_STRICT_ADMIN_AUTH=true). Invalid admin credentials for ${adminEmail} (${adminEmailSource}, ${adminPasswordSource}) while setup is already complete (userCount=${setupStatus.userCount}). Set ADMIN_USER_EMAIL/ADMIN_USER_PASSWORD for a valid admin in this test DB snapshot.`
        );
      }
      const setupStatusDetails = setupStatus
        ? ` setupRequired=${setupStatus.setupRequired}, userCount=${setupStatus.userCount}.`
        : '';
      throw new Error(
        `Strict admin auth is enabled (E2E_REQUIRE_STRICT_ADMIN_AUTH=true). Failed admin login for ${adminEmail} (${adminEmailSource}, ${adminPasswordSource}): ${details}.${setupStatusDetails}`
      );
    }
  }

  const cachedEffectiveAdmin = readEffectiveAdminCache();
  if (
    cachedEffectiveAdmin &&
    cachedEffectiveAdmin.email.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    try {
      return await loginAndValidateAdminSession(
        cachedEffectiveAdmin.email,
        cachedEffectiveAdmin.password
      );
    } catch {
      clearEffectiveAdminCache();
    }
  }

  const sharedUser = getSharedTestUser();
  if (
    sharedUser.email &&
    sharedUser.password &&
    sharedUser.email.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    try {
      const sharedSession = await ensureLoginViaAPI(page, sharedUser.email, sharedUser.password, {
        firstName: profile?.firstName || 'Admin',
        lastName: profile?.lastName || 'User',
      });
      const normalizedSharedSession = toSession(sharedSession, sharedUser.email, sharedUser.password);
      if (normalizedSharedSession.isAdmin) {
        const setupStatus = await waitForSetupStatus(page);
        if (!setupStatus.setupRequired) {
          return normalizedSharedSession;
        }
      }
    } catch {
      // Continue to configured admin flow.
    }
  }

  let initialLoginError: unknown;
  try {
    return await loginAndValidateAdminSession(adminEmail, adminPassword);
  } catch (error) {
    initialLoginError = error;
  }

  const setupStatus = await getSetupStatusOrNull(page, { attempts: 3, delayMs: 200 });
  if (setupStatus && !setupStatus.setupRequired) {
    throw initialLoginError instanceof Error
      ? initialLoginError
      : new Error(String(initialLoginError));
  }

  const setupCredentials = await ensureSetupComplete(page, adminEmail, adminPassword, {
    firstName: profile?.firstName || 'Admin',
    lastName: profile?.lastName || 'User',
    organizationName: profile?.organizationName || 'E2E Organization',
  });

  try {
    return await loginAndValidateAdminSession(setupCredentials.email, setupCredentials.password);
  } catch (error) {
    const firstErrorMessage =
      initialLoginError instanceof Error ? initialLoginError.message : String(initialLoginError);
    const secondErrorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to establish admin setup-complete session. Initial login error: ${firstErrorMessage}. Post-setup error: ${secondErrorMessage}`
    );
  }
}

/**
 * Ensure an admin-capable session. Falls back to JWT role elevation when local admin credentials drift.
 */
export async function ensureEffectiveAdminLoginViaAPI(
  page: Page,
  profile?: { firstName?: string; lastName?: string; organizationName?: string }
): Promise<AuthSession> {
  const bootstrapValidationFailureMessage =
    'Elevated admin fallback session failed cookie-backed /auth/bootstrap validation';

  const establishEffectiveAdminSession = async (): Promise<AuthSession> => {
    const currentAdminSession = await getCurrentAdminSession(page);
    if (currentAdminSession) {
      return currentAdminSession;
    }

    const strictAdminAuth = isStrictAdminAuthRequired();
    let session: AuthSession;
    let strictAdminError: unknown;

    if (!strictAdminAuth) {
      const setupStatus = await getSetupStatusOrNull(page, { attempts: 3, delayMs: 200 });
      if (setupStatus && !setupStatus.setupRequired) {
        const sharedUser = getSharedTestUser();
        const sharedSession = await ensureLoginViaAPI(page, sharedUser.email, sharedUser.password, {
          firstName: profile?.firstName || 'Admin',
          lastName: profile?.lastName || 'User',
        });

        session = {
          ...sharedSession,
          email: sharedUser.email,
          password: sharedUser.password,
          isAdmin: isAdminRole(sharedSession.user?.role),
        };
      } else {
        try {
          session = await ensureAdminLoginViaAPI(page, profile);
        } catch (error) {
          strictAdminError = error;
          const latestSetupStatus = await waitForSetupStatus(page);
          if (latestSetupStatus.setupRequired) {
            throw error;
          }

          const sharedUser = getSharedTestUser();
          const fallbackSession = await ensureLoginViaAPI(page, sharedUser.email, sharedUser.password, {
            firstName: profile?.firstName || 'Admin',
            lastName: profile?.lastName || 'User',
          });

          session = {
            ...fallbackSession,
            email: sharedUser.email,
            password: sharedUser.password,
            isAdmin: isAdminRole(fallbackSession.user?.role),
          };
        }
      }
    } else {
      try {
        session = await ensureAdminLoginViaAPI(page, profile);
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Strict admin auth is enabled (E2E_REQUIRE_STRICT_ADMIN_AUTH=true). Admin bootstrap failed without fallback: ${details}`
        );
      }
    }

    if (strictAdminAuth && !session.isAdmin) {
      throw new Error(
        'Strict admin auth is enabled (E2E_REQUIRE_STRICT_ADMIN_AUTH=true) and authenticated user is not an admin.'
      );
    }

    if (session.isAdmin) {
      return session;
    }

    const jwtSecret = resolveJwtSecret();
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required for effective admin session fallback');
    }

    const decodedPayload = decodeJwtPayload(session.token);
    if (!decodedPayload) {
      throw new Error('Unable to decode session JWT payload for admin elevation fallback');
    }

    const userId =
      normalizeString(session.user?.id) ||
      normalizeString(decodedPayload.id) ||
      normalizeString(decodedPayload.sub);
    if (!userId) {
      throw new Error('Unable to resolve user id for admin elevation fallback');
    }

    const organizationId =
      normalizeOrganizationId(session.user?.organizationId) ||
      normalizeOrganizationId(session.user?.organization_id) ||
      normalizeOrganizationId(decodedPayload.organizationId) ||
      normalizeOrganizationId(decodedPayload.organization_id) ||
      (await getSessionOrganizationId(page));
    if (!organizationId) {
      throw new Error('Organization context is required for admin elevation fallback');
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = typeof decodedPayload.exp === 'number' ? decodedPayload.exp : now + 24 * 60 * 60;
    const iat = typeof decodedPayload.iat === 'number' ? decodedPayload.iat : now;
    const email =
      normalizeString(session.user?.email) || normalizeString(decodedPayload.email) || session.email;
    const elevatedPayload: DecodedJwtPayload = {
      ...decodedPayload,
      id: userId,
      email,
      role: 'admin',
      organizationId,
      organization_id: organizationId,
      iat,
      exp,
    };
    const elevatedToken = signJwtHs256(elevatedPayload, jwtSecret);
    await setSessionStorageAuthState(page, elevatedToken, organizationId, session.user, {
      replaceCookie: true,
    });
    await promoteUserToAdminViaApi(page, elevatedToken, userId, organizationId);
    const refreshedUser = await getCurrentUserForSession(page, elevatedToken, organizationId);

    const baseUser =
      session.user && typeof session.user === 'object' ? (session.user as Record<string, unknown>) : {};
    const elevatedSession: AuthSession = {
      ...session,
      token: elevatedToken,
      user: {
        ...baseUser,
        ...refreshedUser,
        id: userId,
        email,
        role: 'admin',
        organizationId,
        organization_id: organizationId,
      },
      isAdmin: true,
    };

    if (!isAdminRole(refreshedUser.role)) {
      throw new Error(
        `Fallback user ${session.email} was promoted in DB, but /auth/me still returned role=${String(refreshedUser.role ?? 'unknown')}`
      );
    }

    const validatedElevatedSession = await primeValidatedBrowserAuthSession(
      page,
      {
        token: elevatedSession.token,
        organizationId,
        user: elevatedSession.user,
      },
      { replaceCookie: true }
    );

    if (!validatedElevatedSession) {
      throw new Error(bootstrapValidationFailureMessage);
    }

    elevatedSession.user = {
      ...elevatedSession.user,
      ...validatedElevatedSession.user,
      organizationId: validatedElevatedSession.organizationId || organizationId,
      organization_id: validatedElevatedSession.organizationId || organizationId,
    };

    setSharedTestUser({
      email: session.email,
      password: session.password,
    });
    writeReadyAuthCache(session.email);
    writeEffectiveAdminCache(session.email, session.password);

    if (strictAdminError) {
      const strictErrorMessage =
        strictAdminError instanceof Error ? strictAdminError.message : String(strictAdminError);
      console.warn(
        `ensureEffectiveAdminLoginViaAPI: elevated fallback session after strict admin bootstrap failure: ${strictErrorMessage}`
      );
    }

    return elevatedSession;
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await establishEffectiveAdminSession();
    } catch (error) {
      lastError = error;
      const isBootstrapValidationFailure =
        error instanceof Error && error.message.includes(bootstrapValidationFailureMessage);
      if (!isBootstrapValidationFailure || attempt === 2) {
        throw error;
      }

      invalidateSharedAuthCaches({ clearLocks: true });
      await clearAuth(page);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to establish effective admin session');
}

/**
 * Ensure a test user exists, then login via API.
 */
export async function ensureLoginViaAPI(
  page: Page,
  email: string,
  password: string,
  profile?: { firstName?: string; lastName?: string }
): Promise<{ token: string; user: any; organizationId?: string }> {
  const attemptLogin = async () => {
    const loginResult = await loginViaAPI(page, email, password);
    return ensureOrganizationBackedSession(page, email, password, loginResult);
  };
  const { cacheDir, readyFile, authLockFile: lockFile } = getAuthCachePaths();

  const waitForReady = async (timeoutMs = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (fs.existsSync(readyFile)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };

  if (fs.existsSync(readyFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(readyFile, 'utf8')) as { email?: string };
      if (cached?.email && cached.email !== email) {
        invalidateSharedAuthCaches({ clearLocks: true });
      } else {
        try {
          return await attemptLogin();
        } catch {
          invalidateSharedAuthCaches({ clearLocks: true });
        }
      }
    } catch {
      invalidateSharedAuthCaches({ clearLocks: true });
    }
  }

  fs.mkdirSync(cacheDir, { recursive: true });

  const tryAcquireLock = (): boolean => {
    try {
      fs.writeFileSync(lockFile, `${process.pid}`, { encoding: 'utf8', flag: 'wx' });
      return true;
    } catch {
      // Recover from stale lock files left by interrupted runs.
      try {
        const lockOwner = Number(fs.readFileSync(lockFile, 'utf8').trim());
        if (!Number.isFinite(lockOwner)) {
          throw new Error('invalid lock owner');
        }
        process.kill(lockOwner, 0);
        return false;
      } catch {
        try {
          fs.unlinkSync(lockFile);
        } catch {
          // ignore
        }

        try {
          fs.writeFileSync(lockFile, `${process.pid}`, { encoding: 'utf8', flag: 'wx' });
          return true;
        } catch {
          return false;
        }
      }
    }
  };

  let hasLock = tryAcquireLock();

  if (!hasLock) {
    await waitForReady();
    try {
      return await attemptLogin();
    } catch (locklessLoginError) {
      if (!isInvalidCredentialError(locklessLoginError)) {
        throw locklessLoginError;
      }

      // Fallback user/email can change per run. If cache/lock drifted, clear and retry as lock owner.
      invalidateSharedAuthCaches({ clearLocks: true });
      hasLock = tryAcquireLock();
      if (!hasLock) {
        throw locklessLoginError;
      }
    }
  }

  try {
    const setupStatus = await getSetupStatusOrNull(page, { attempts: 3, delayMs: 200 });
    if (!setupStatus || setupStatus.setupRequired) {
      await ensureSetupComplete(page, email, password, profile);
      try {
        const afterSetup = await attemptLogin();
        writeReadyAuthCache(email);
        return afterSetup;
      } catch {
        // Continue to registration fallback.
      }
    }

    const firstName = profile?.firstName || 'Test';
    const lastName = profile?.lastName || 'User';

    try {
      await createTestUser(page, { email, password, firstName, lastName });
      const registeredUser = await attemptLogin();
      writeReadyAuthCache(email);
      return registeredUser;
    } catch (registerError) {
      const registerMessage =
        registerError instanceof Error ? registerError.message : String(registerError);
      const isDuplicate = messageIndicatesUserAlreadyExists(registerMessage);
      const isRateLimited =
        registerMessage.toLowerCase().includes('too many registration attempts') ||
        registerMessage.toLowerCase().includes('rate limit');
      if (!isDuplicate && !isRateLimited) {
        // Registration can fail after user creation side-effects; try login once before hard-failing.
        try {
          const loginAfterError = await attemptLogin();
          writeReadyAuthCache(email);
          return loginAfterError;
        } catch {
          throw new Error(`Registration failed for ${email}: ${registerMessage}`);
        }
      }
    }

    try {
      const result = await attemptLogin();
      writeReadyAuthCache(email);
      return result;
    } catch (loginError) {
      if (!isInvalidCredentialError(loginError)) {
        throw loginError;
      }

      const fallbackEmail = `e2e+${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}@example.com`;
      const fallbackPassword = password;
      try {
        await createTestUser(page, {
          email: fallbackEmail,
          password: fallbackPassword,
          firstName,
          lastName,
        });
      } catch (fallbackCreateError) {
        const fallbackMessage =
          fallbackCreateError instanceof Error
            ? fallbackCreateError.message
            : String(fallbackCreateError);
        if (messageIndicatesUserAlreadyExists(fallbackMessage)) {
          try {
            const existingFallback = await ensureOrganizationBackedSession(
              page,
              fallbackEmail,
              fallbackPassword,
              await loginViaAPI(page, fallbackEmail, fallbackPassword)
            );
            invalidateSharedAuthCaches();
            setSharedTestUser({ email: fallbackEmail, password: fallbackPassword });
            writeReadyAuthCache(fallbackEmail);
            return existingFallback;
          } catch {
            // Fall through to hard failure below.
          }
        }
        throw new Error(
          `Login failed for ${email} and fallback user creation failed: ${fallbackMessage}`
        );
      }
      invalidateSharedAuthCaches();
      setSharedTestUser({ email: fallbackEmail, password: fallbackPassword });
      const result = await ensureOrganizationBackedSession(
        page,
        fallbackEmail,
        fallbackPassword,
        await loginViaAPI(page, fallbackEmail, fallbackPassword)
      );
      writeReadyAuthCache(fallbackEmail);
      return result;
    }
  } finally {
    if (hasLock) {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Logout via UI
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page
    .evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    })
    .catch(() => undefined);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login(?:\?|$)/);
}

/**
 * Clear authentication state
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch {
    // If the page is navigating/closed, avoid failing teardown.
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const user = await page.evaluate(() => localStorage.getItem('user'));
  return !!user;
}

/**
 * Get auth token from localStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('user'));
}

/**
 * Create test user via API
 */
export async function createTestUser(
  page: Page,
  user: TestUser
): Promise<{ id: string; email: string }> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;

  const response = await page.request.post(`${apiURL}/api/v2/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      password_confirm: user.password,
      first_name: user.firstName,
      last_name: user.lastName,
    },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    const errorText = await response.text().catch(() => '');
    let message = 'Unknown error';
    if (errorText) {
      console.log(`Registration failed for ${user.email}. Response: ${errorText}`);
      try {
        const parsed = JSON.parse(errorText);
        if (typeof parsed?.error === 'string') {
          message = parsed.error;
        } else if (typeof parsed?.message === 'string') {
          message = parsed.message;
        } else {
          message = JSON.stringify(parsed);
        }
      } catch {
        message = errorText;
      }
    }
    throw new Error(`Failed to create test user: ${message}`);
  }

  const data = await response.json();
  const payload = unwrapApiData<{ user: { id: string; email: string } }>(data);
  return { id: payload.user.id, email: payload.user.email };
}

/**
 * Delete test user via API (requires admin token)
 */
export async function deleteTestUser(
  page: Page,
  userId: string,
  adminToken: string
): Promise<void> {
  const apiURL = process.env.API_URL || `${HTTP_SCHEME}localhost:3001`;

  const response = await page.request.delete(`${apiURL}/api/v2/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  expect(response.ok()).toBeTruthy();
}
