import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { createApiClient } from '../httpClient';

// Stub axios.create to intercept config
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        defaults: { headers: {} },
      })),
      get: vi.fn().mockResolvedValue({ data: { csrfToken: 'test-csrf' } }),
    },
  };
});

describe('createApiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates an axios instance with withCredentials: true', () => {
    createApiClient({ onUnauthorized: vi.fn() });
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({ withCredentials: true })
    );
  });

  it('does NOT inject an Authorization header from localStorage', () => {
    localStorage.setItem('token', 'some-leftover-token');

    let capturedRequestInterceptor: ((config: object) => object) | null = null;

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: {
          use: vi.fn((fn) => {
            capturedRequestInterceptor = fn as (config: object) => object;
          }),
        },
        response: { use: vi.fn() },
      },
      defaults: { headers: {} },
    } as ReturnType<typeof axios.create>);

    createApiClient({ onUnauthorized: vi.fn() });

    expect(capturedRequestInterceptor).not.toBeNull();

    // Simulate a GET request going through the interceptor
    const config = { method: 'get', headers: {} };
    if (!capturedRequestInterceptor) {
      throw new Error('Request interceptor was not captured');
    }
    const result = capturedRequestInterceptor(config) as Promise<object>;

    // The interceptor is async, so we need to handle that
    return Promise.resolve(result).then((finalConfig) => {
      const cfg = finalConfig as { headers?: Record<string, string> };
      expect(cfg.headers?.Authorization).toBeUndefined();
    });
  });

  it('sets organization ID header when available in localStorage', async () => {
    localStorage.setItem('organizationId', 'org-123');

    let capturedRequestInterceptor: ((config: object) => Promise<object>) | null = null;

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: {
          use: vi.fn((fn) => {
            capturedRequestInterceptor = fn as (config: object) => Promise<object>;
          }),
        },
        response: { use: vi.fn() },
      },
      defaults: { headers: {} },
    } as ReturnType<typeof axios.create>);

    createApiClient({ onUnauthorized: vi.fn() });

    const config = { method: 'get', headers: {} };
    if (!capturedRequestInterceptor) {
      throw new Error('Request interceptor was not captured');
    }
    const result = await capturedRequestInterceptor(config);
    const cfg = result as { headers?: Record<string, string> };
    expect(cfg.headers?.['X-Organization-Id']).toBe('org-123');
  });

  it('skips organization header when includeOrganizationHeader is false', async () => {
    localStorage.setItem('organizationId', 'org-123');

    let capturedRequestInterceptor: ((config: object) => Promise<object>) | null = null;

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: {
          use: vi.fn((fn) => {
            capturedRequestInterceptor = fn as (config: object) => Promise<object>;
          }),
        },
        response: { use: vi.fn() },
      },
      defaults: { headers: {} },
    } as ReturnType<typeof axios.create>);

    createApiClient({ onUnauthorized: vi.fn(), includeOrganizationHeader: false });

    const config = { method: 'get', headers: {} };
    if (!capturedRequestInterceptor) {
      throw new Error('Request interceptor was not captured');
    }
    const result = await capturedRequestInterceptor(config);
    const cfg = result as { headers?: Record<string, string> };
    expect(cfg.headers?.['X-Organization-Id']).toBeUndefined();
  });
});
