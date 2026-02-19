import { createApiClient, createRequestController, createCancellableRequest } from './httpClient';
import type { ApiErrorResponse } from '../types/api';
import { createUnauthorizedHandler } from './unauthorizedHandler';

const api = createApiClient({
  onUnauthorized: createUnauthorizedHandler(),
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
