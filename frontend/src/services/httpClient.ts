import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios';

type UnauthorizedHandler = (error: AxiosError) => void;

export interface ApiClientOptions {
  tokenKey: string;
  onUnauthorized: UnauthorizedHandler;
  baseURL?: string;
  includeOrganizationHeader?: boolean;
  organizationIdKey?: string;
  defaultOrganizationId?: string;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _abortController?: AbortController;
}

const resolveOrganizationId = (
  organizationIdKey: string,
  defaultOrganizationId?: string
): string | undefined => {
  return localStorage.getItem(organizationIdKey) || defaultOrganizationId || undefined;
};

/**
 * Calculate exponential backoff delay with jitter
 */
const calculateBackoff = (retryCount: number, config: RetryConfig): number => {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, retryCount);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
};

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if an error is retryable
 */
const isRetryableError = (error: AxiosError, config: RetryConfig): boolean => {
  if (!error.response) {
    // Network errors are retryable
    return error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
  }
  return config.retryableStatuses.includes(error.response.status);
};

export const createApiClient = (options: ApiClientOptions): AxiosInstance => {
  const {
    tokenKey,
    onUnauthorized,
    baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    includeOrganizationHeader = true,
    organizationIdKey = 'organizationId',
    defaultOrganizationId = import.meta.env.VITE_DEFAULT_ORGANIZATION_ID,
    retryConfig = DEFAULT_RETRY_CONFIG,
  } = options;

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Enable cookies for httpOnly auth tokens
  });

  // CSRF token cache
  let csrfToken: string | null = null;

  // Fetch CSRF token from server
  const fetchCsrfToken = async (): Promise<string | null> => {
    try {
      const response = await axios.get(`${baseURL}/auth/csrf-token`, { withCredentials: true });
      csrfToken = response.data.csrfToken;
      return csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    }
  };

  // Request interceptor for auth, organization headers, and CSRF token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Still include Authorization header for backward compatibility during migration
      const token = localStorage.getItem(tokenKey);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (includeOrganizationHeader) {
        const organizationId = resolveOrganizationId(organizationIdKey, defaultOrganizationId);
        if (organizationId) {
          config.headers = config.headers || {};
          config.headers['X-Organization-Id'] = organizationId;
        }
      }

      // Add CSRF token for state-changing requests
      const method = config.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        // Fetch CSRF token if we don't have one
        if (!csrfToken) {
          await fetchCsrfToken();
        }
        if (csrfToken) {
          config.headers = config.headers || {};
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and retry logic
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as ExtendedAxiosRequestConfig | undefined;

      // Handle 401 unauthorized
      if (error.response?.status === 401) {
        onUnauthorized(error);
        return Promise.reject(error);
      }

      // Handle 403 CSRF errors - refresh token and retry once
      if (error.response?.status === 403 && config) {
        const responseData = error.response.data as { error?: string } | undefined;
        if (responseData?.error?.includes('CSRF')) {
          // Clear cached token and fetch a new one
          csrfToken = null;
          await fetchCsrfToken();

          // Retry the request once with new CSRF token
          if (csrfToken && !config._retryCount) {
            config._retryCount = 1;
            config.headers = config.headers || {};
            config.headers['X-CSRF-Token'] = csrfToken;
            return client.request(config);
          }
        }
      }

      // Handle retries
      if (config && isRetryableError(error, retryConfig)) {
        config._retryCount = config._retryCount || 0;

        if (config._retryCount < retryConfig.maxRetries) {
          config._retryCount += 1;
          const delay = calculateBackoff(config._retryCount, retryConfig);

          await sleep(delay);
          return client.request(config);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Create an AbortController for request cancellation
 * Usage:
 *   const { signal, cancel } = createRequestController();
 *   api.get('/endpoint', { signal }).then(...);
 *   // Later: cancel();
 */
export const createRequestController = (): { signal: AbortSignal; cancel: () => void } => {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
};

/**
 * Helper to create a request with automatic cancellation on unmount
 * Usage in React:
 *   useEffect(() => {
 *     const { request, cancel } = createCancellableRequest(api.get, '/endpoint');
 *     request.then(setData).catch(handleError);
 *     return cancel;
 *   }, []);
 */
export const createCancellableRequest = <T>(
  requestFn: (url: string, config?: AxiosRequestConfig) => Promise<T>,
  url: string,
  config?: AxiosRequestConfig
): { request: Promise<T>; cancel: () => void } => {
  const controller = new AbortController();
  const request = requestFn(url, { ...config, signal: controller.signal });
  return {
    request,
    cancel: () => controller.abort(),
  };
};
