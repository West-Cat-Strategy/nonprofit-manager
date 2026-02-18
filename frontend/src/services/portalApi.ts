import { createApiClient } from './httpClient';
import type { ApiErrorResponse } from '../types/api';

let portalUnauthorizedEventDispatched = false;

const portalApi = createApiClient({
  tokenKey: 'portal_token',
  onUnauthorized: () => {
    localStorage.removeItem('portal_token');
    const onPublicPortalRoute =
      window.location.pathname.startsWith('/portal/login') ||
      window.location.pathname.startsWith('/portal/signup') ||
      window.location.pathname.startsWith('/portal/accept-invitation');

    if (onPublicPortalRoute || portalUnauthorizedEventDispatched) {
      return;
    }

    portalUnauthorizedEventDispatched = true;
    window.dispatchEvent(new CustomEvent('portal:unauthorized'));
    window.setTimeout(() => {
      portalUnauthorizedEventDispatched = false;
    }, 1500);
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
