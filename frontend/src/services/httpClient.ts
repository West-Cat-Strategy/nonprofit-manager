import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

type UnauthorizedHandler = (error: any) => void;

export interface ApiClientOptions {
  tokenKey: string;
  onUnauthorized: UnauthorizedHandler;
  baseURL?: string;
  includeOrganizationHeader?: boolean;
  organizationIdKey?: string;
  defaultOrganizationId?: string;
}

const resolveOrganizationId = (
  organizationIdKey: string,
  defaultOrganizationId?: string
): string | undefined => {
  return localStorage.getItem(organizationIdKey) || defaultOrganizationId || undefined;
};

export const createApiClient = (options: ApiClientOptions): AxiosInstance => {
  const {
    tokenKey,
    onUnauthorized,
    baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    includeOrganizationHeader = true,
    organizationIdKey = 'organizationId',
    defaultOrganizationId = import.meta.env.VITE_DEFAULT_ORGANIZATION_ID,
  } = options;

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
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

      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        onUnauthorized(error);
      }
      return Promise.reject(error);
    }
  );

  return client;
};
