import { createApiClient } from './httpClient';
import type { ApiErrorResponse } from '../types/api';

const api = createApiClient({
  tokenKey: 'token',
  onUnauthorized: (error) => {
    const isSetupCheck = error.config?.url?.includes('/auth/setup-status');
    const isSetupPage = window.location.pathname === '/setup';

    if (!isSetupCheck && !isSetupPage) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  },
});

const typedApi = api as typeof api & {
  get: <T = unknown>(...args: Parameters<typeof api.get>) => ReturnType<typeof api.get<T>>;
  post: <T = unknown>(...args: Parameters<typeof api.post>) => ReturnType<typeof api.post<T>>;
  put: <T = unknown>(...args: Parameters<typeof api.put>) => ReturnType<typeof api.put<T>>;
  delete: <T = unknown>(...args: Parameters<typeof api.delete>) => ReturnType<typeof api.delete<T>>;
};

export type { ApiErrorResponse };
export default typedApi;

