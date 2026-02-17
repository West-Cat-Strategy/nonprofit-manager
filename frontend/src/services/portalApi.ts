import { createApiClient } from './httpClient';
import type { ApiErrorResponse } from '../types/api';

const portalApi = createApiClient({
  tokenKey: 'portal_token',
  onUnauthorized: () => {
    localStorage.removeItem('portal_token');
    if (!window.location.pathname.startsWith('/portal/login')) {
      window.location.href = '/portal/login';
    }
  },
});

const typedPortalApi = portalApi as typeof portalApi & {
  get: <T = unknown>(...args: Parameters<typeof portalApi.get>) => ReturnType<typeof portalApi.get<T>>;
  post: <T = unknown>(...args: Parameters<typeof portalApi.post>) => ReturnType<typeof portalApi.post<T>>;
  put: <T = unknown>(...args: Parameters<typeof portalApi.put>) => ReturnType<typeof portalApi.put<T>>;
  delete: <T = unknown>(...args: Parameters<typeof portalApi.delete>) => ReturnType<typeof portalApi.delete<T>>;
};

export type { ApiErrorResponse };
export default typedPortalApi;

