import { createApiClient, createRequestController, createCancellableRequest } from './httpClient';
import type { ApiErrorResponse } from '../types/api';

let unauthorizedEventDispatched = false;

const api = createApiClient({
  onUnauthorized: (error) => {
    const isSetupCheck = error.config?.url?.includes('/auth/setup-status');
    const isAuthMe = error.config?.url?.includes('/auth/me');
    const isSetupPage = window.location.pathname === '/setup';
    const isLoginPage = window.location.pathname === '/login';
    const isPortalPage = window.location.pathname.startsWith('/portal');

    if (!isSetupCheck && !isAuthMe && !isSetupPage && !isLoginPage && !isPortalPage) {
      if (unauthorizedEventDispatched) {
        return;
      }

      unauthorizedEventDispatched = true;
      window.dispatchEvent(new CustomEvent('app:unauthorized'));

      // Allow future auth failures to be surfaced after the current redirect cycle.
      window.setTimeout(() => {
        unauthorizedEventDispatched = false;
      }, 1500);
    }
  },
  tokenKey: 'token', // Use localStorage token as fallback for auth
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableStatuses: [408, 500, 502, 503, 504],
  },
});

const typedApi = api as typeof api & {
  get: <T = unknown>(...args: Parameters<typeof api.get>) => ReturnType<typeof api.get<T>>;
  post: <T = unknown>(...args: Parameters<typeof api.post>) => ReturnType<typeof api.post<T>>;
  put: <T = unknown>(...args: Parameters<typeof api.put>) => ReturnType<typeof api.put<T>>;
  delete: <T = unknown>(...args: Parameters<typeof api.delete>) => ReturnType<typeof api.delete<T>>;
};

export type { ApiErrorResponse };
export { createRequestController, createCancellableRequest };
export default typedApi;
