import { createApiClient } from './httpClient';

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

export default api;
