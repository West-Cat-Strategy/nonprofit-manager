import { createApiClient } from './httpClient';

const portalApi = createApiClient({
  tokenKey: 'portal_token',
  onUnauthorized: () => {
    localStorage.removeItem('portal_token');
    if (!window.location.pathname.startsWith('/portal/login')) {
      window.location.href = '/portal/login';
    }
  },
});

export default portalApi;
