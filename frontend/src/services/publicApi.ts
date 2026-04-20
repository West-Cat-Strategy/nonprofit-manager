import { createApiClient } from './httpClient';
import type { ApiErrorResponse } from '../types/api';

const publicApi = createApiClient({
  onUnauthorized: () => {},
  includeOrganizationHeader: false,
});

const typedPublicApi = publicApi as typeof publicApi & {
  get: <T = unknown>(...args: Parameters<typeof publicApi.get>) => ReturnType<typeof publicApi.get<T>>;
  post: <T = unknown>(...args: Parameters<typeof publicApi.post>) => ReturnType<typeof publicApi.post<T>>;
  put: <T = unknown>(...args: Parameters<typeof publicApi.put>) => ReturnType<typeof publicApi.put<T>>;
  delete: <T = unknown>(...args: Parameters<typeof publicApi.delete>) => ReturnType<typeof publicApi.delete<T>>;
};

export type { ApiErrorResponse };
export default typedPublicApi;
