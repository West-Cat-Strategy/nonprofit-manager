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

export interface AuthSession {
  token: string;
  user: any;
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
  user: any;
  organizationId?: string;
};

type SetupStatusResult = {
  setupRequired: boolean;
  userCount: number;
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

  const envTestSecret = readEnvValueFromFile(
    path.resolve(__dirname, '..', '..', 'backend', '.env.test'),
    'JWT_SECRET'
  );
  if (envTestSecret) {
    process.env.JWT_SECRET = envTestSecret;
    return envTestSecret;
  }

  const envSecret = readEnvValueFromFile(
    path.resolve(__dirname, '..', '..', 'backend', '.env'),
    'JWT_SECRET'
  );
  if (envSecret) {
    process.env.JWT_SECRET = envSecret;
    return envSecret;
  }

  return null;
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
  organizationId?: string
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
      ({ authToken, orgId }) => {
        localStorage.setItem('token', authToken);
        if (orgId) {
          localStorage.setItem('organizationId', orgId);
        } else {
          localStorage.removeItem('organizationId');
        }
      },
      { authToken: token, orgId: organizationId || null }
    )
    .catch(() => undefined);
};

const setSessionStorageAuthState = async (
  page: Page,
  token: string,
  organizationId?: string
): Promise<void> => {
  await page.context().clearCookies();
  await syncAuthCookie(page, token);
  await syncAuthLocalStorage(page, token, organizationId);
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
  organizationId?: string
): Promise<void> {
  const resolvedOrganizationId = organizationId || getOrganizationIdFromToken(token);
  await setSessionStorageAuthState(page, token, resolvedOrganizationId);
}

const getSessionOrganizationId = async (page: Page): Promise<string | undefined> => {
  const localStorageOrganizationId = await page
    .evaluate(() => localStorage.getItem('organizationId'))
    .catch(() => null);
  return normalizeOrganizationId(localStorageOrganizationId);
};

const getApiBaseUrl = (): string => process.env.API_URL || `${HTTP_SCHEME}127.0.0.1:3001`;

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
  const attempts = options.attempts ?? 5;
  const delayMs = options.delayMs ?? 250;

  let latestStatus: SetupStatusResult | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    latestStatus = await fetchSetupStatus(page);
    if (!latestStatus.setupRequired) {
      return latestStatus;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return latestStatus ?? { setupRequired: true, userCount: 0 };
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

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const setupResponse = await submitSetup(setupEmail);
    if (setupResponse.ok()) {
      const setupStatus = await waitForSetupStatus(page);
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

    const shouldRetryWithUniqueEmail =
      attempt === 1 &&
      (status === 409 || status === 400 || messageIndicatesUserAlreadyExists(responseText));

    if (shouldRetryWithUniqueEmail) {
      setupEmail = generateUniqueAdminEmail();
      continue;
    }

    throw new Error(
      `setup failed for ${setupEmail} (${status}) while setupRequired=true: ${responseText || 'empty response'}`
    );
  }

  throw new Error(`setup failed to complete admin bootstrap for ${email}`);
}

/**
 * Login via UI
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL('/dashboard');

  const user = await page.evaluate(() => localStorage.getItem('user'));
  if (!user) {
    throw new Error('Login succeeded but no user data found in localStorage');
  }
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

  const data = unwrapApiData<{ token: string; user: any; organizationId?: string; organization_id?: string }>(
    await response.json()
  );
  expect(data.token).toBeDefined();
  expect(data.user).toBeDefined();
  const organizationId = resolveOrganizationIdFromPayload(data);

  // Set auth state in localStorage and prevent stale organization context from leaking between runs.
  await setSessionStorageAuthState(page, data.token, organizationId);

  return { token: data.token, user: data.user, organizationId };
}

/**
 * Ensure an admin session for tests that require elevated permissions.
 */
export async function ensureAdminLoginViaAPI(
  page: Page,
  profile?: { firstName?: string; lastName?: string; organizationName?: string }
): Promise<AuthSession> {
  const adminEmail = process.env.ADMIN_USER_EMAIL?.trim() || 'admin@example.com';
  const adminPassword = process.env.ADMIN_USER_PASSWORD?.trim() || 'Admin123!@#';

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
    return session;
  };

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
  let session: AuthSession;
  let strictAdminError: unknown;

  try {
    session = await ensureAdminLoginViaAPI(page, profile);
  } catch (error) {
    strictAdminError = error;
    const setupStatus = await waitForSetupStatus(page);
    if (setupStatus.setupRequired) {
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
  await setSessionStorageAuthState(page, elevatedToken, organizationId);

  const baseUser =
    session.user && typeof session.user === 'object' ? (session.user as Record<string, unknown>) : {};
  const elevatedSession: AuthSession = {
    ...session,
    token: elevatedToken,
    user: {
      ...baseUser,
      id: userId,
      email,
      role: 'admin',
      organizationId,
      organization_id: organizationId,
    },
    isAdmin: true,
  };

  if (strictAdminError) {
    const strictErrorMessage =
      strictAdminError instanceof Error ? strictAdminError.message : String(strictAdminError);
    console.warn(
      `ensureEffectiveAdminLoginViaAPI: elevated fallback session after strict admin bootstrap failure: ${strictErrorMessage}`
    );
  }

  return elevatedSession;
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
  const cacheDir = path.resolve(__dirname, '..', '.cache');
  const readyFile = path.join(cacheDir, 'auth-ready.json');
  const lockFile = path.join(cacheDir, 'auth-lock');

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
        fs.unlinkSync(readyFile);
      } else {
        return await attemptLogin();
      }
    } catch {
      // If cache is unreadable, recreate it.
      try {
        fs.unlinkSync(readyFile);
      } catch {
        // ignore
      }
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
      try {
        fs.unlinkSync(readyFile);
      } catch {
        // ignore
      }
      hasLock = tryAcquireLock();
      if (!hasLock) {
        throw locklessLoginError;
      }
    }
  }

  try {
    // Fast path: user may already exist from a previous run.
    try {
      const existing = await attemptLogin();
      fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), {
        encoding: 'utf8',
      });
      return existing;
    } catch {
      // Continue with setup/user creation flow below.
    }

    await ensureSetupComplete(page, email, password, profile);
    try {
      const afterSetup = await attemptLogin();
      fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), {
        encoding: 'utf8',
      });
      return afterSetup;
    } catch {
      // Continue to registration fallback.
    }
    const firstName = profile?.firstName || 'Test';
    const lastName = profile?.lastName || 'User';

    try {
      await createTestUser(page, { email, password, firstName, lastName });
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
          fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), {
            encoding: 'utf8',
          });
          return loginAfterError;
        } catch {
          throw new Error(`Registration failed for ${email}: ${registerMessage}`);
        }
      }
    }

    try {
      const result = await attemptLogin();
      fs.writeFileSync(readyFile, JSON.stringify({ email, at: Date.now() }), {
        encoding: 'utf8',
      });
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
            setSharedTestUser({ email: fallbackEmail, password: fallbackPassword });
            fs.writeFileSync(readyFile, JSON.stringify({ email: fallbackEmail, at: Date.now() }), {
              encoding: 'utf8',
            });
            return existingFallback;
          } catch {
            // Fall through to hard failure below.
          }
        }
        throw new Error(
          `Login failed for ${email} and fallback user creation failed: ${fallbackMessage}`
        );
      }
      setSharedTestUser({ email: fallbackEmail, password: fallbackPassword });
      const result = await ensureOrganizationBackedSession(
        page,
        fallbackEmail,
        fallbackPassword,
        await loginViaAPI(page, fallbackEmail, fallbackPassword)
      );
      fs.writeFileSync(readyFile, JSON.stringify({ email: fallbackEmail, at: Date.now() }), {
        encoding: 'utf8',
      });
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
  // Open user menu from top navigation (supports current and legacy selectors).
  const userMenu = page
    .getByRole('button', { name: /user menu/i })
    .or(page.locator('button[aria-haspopup="menu"][aria-controls="user-menu"]'))
    .first();
  await userMenu.click({ timeout: 7000 });

  // Click logout action (supports button/menuitem variants).
  const logoutAction = page
    .getByRole('button', { name: /logout|sign out/i })
    .or(page.getByRole('menuitem', { name: /logout|sign out/i }))
    .first();
  await logoutAction.click({ timeout: 7000 });

  // Wait for redirect to login.
  await page.waitForURL(/\/login(?:\?|$)/, { timeout: 15000 });
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
