import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import type * as AxiosModule from 'axios';
import { createApiClient, createCancellableRequest, createRequestController } from '../httpClient';

// Stub axios.create to intercept config
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof AxiosModule>();
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

  it('creates portalApi with organization headers disabled by default', async () => {
    vi.resetModules();

    const client = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    const createApiClientMock = vi.fn(() => client);

    vi.doMock('../httpClient', () => ({
      createApiClient: createApiClientMock,
    }));

    await import('../portalApi');

    expect(createApiClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        includeOrganizationHeader: false,
      })
    );

    vi.doUnmock('../httpClient');
    vi.resetModules();
  });

  it('fetches CSRF from /api/v2 when baseURL is /api', async () => {
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

    createApiClient({ onUnauthorized: vi.fn(), baseURL: '/api' });

    if (!capturedRequestInterceptor) {
      throw new Error('Request interceptor was not captured');
    }

    const result = await capturedRequestInterceptor({ method: 'post', headers: {} });
    const cfg = result as { headers?: Record<string, string> };

    expect(axios.get).toHaveBeenCalledWith('/api/v2/auth/csrf-token', { withCredentials: true });
    expect(cfg.headers?.['X-CSRF-Token']).toBe('test-csrf');
  });

  it('fetches CSRF from /api/v2/auth when baseURL already includes /api/v2', async () => {
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

    createApiClient({ onUnauthorized: vi.fn(), baseURL: '/api/v2' });

    if (!capturedRequestInterceptor) {
      throw new Error('Request interceptor was not captured');
    }

    await capturedRequestInterceptor({ method: 'post', headers: {} });
    expect(axios.get).toHaveBeenCalledWith('/api/v2/auth/csrf-token', { withCredentials: true });
  });

  it('normalizes canonical API error messages before rejecting', async () => {
    let capturedResponseErrorInterceptor: ((error: object) => Promise<never>) | null = null;

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_, rejected) => {
            capturedResponseErrorInterceptor = rejected as (error: object) => Promise<never>;
          }),
        },
      },
      defaults: { headers: {} },
      request: vi.fn(),
    } as ReturnType<typeof axios.create>);

    createApiClient({ onUnauthorized: vi.fn() });

    if (!capturedResponseErrorInterceptor) {
      throw new Error('Response interceptor was not captured');
    }

    const error = {
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: 'bad_request',
            message: 'Account type is invalid',
          },
        },
      },
    };

    await expect(capturedResponseErrorInterceptor(error)).rejects.toMatchObject({
      message: 'Account type is invalid',
    });
  });

  it('normalizes validation errors using the first issue and correlation ID', async () => {
    let capturedResponseErrorInterceptor: ((error: object) => Promise<never>) | null = null;

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_, rejected) => {
            capturedResponseErrorInterceptor = rejected as (error: object) => Promise<never>;
          }),
        },
      },
      defaults: { headers: {} },
      request: vi.fn(),
    } as ReturnType<typeof axios.create>);

    createApiClient({ onUnauthorized: vi.fn() });

    if (!capturedResponseErrorInterceptor) {
      throw new Error('Response interceptor was not captured');
    }

    const error = {
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            details: {
              issues: [
                {
                  source: 'query',
                  path: 'status',
                  message: 'Invalid option',
                  code: 'invalid_enum_value',
                },
              ],
            },
          },
          correlationId: 'req-123',
        },
      },
    };

    await expect(capturedResponseErrorInterceptor(error)).rejects.toMatchObject({
      message: 'status: Invalid option (Ref: req-123)',
    });
  });

  it('notifies the unauthorized handler for 401 responses', async () => {
    let capturedResponseErrorInterceptor: ((error: object) => Promise<never>) | null = null;
    const onUnauthorized = vi.fn();

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_, rejected) => {
            capturedResponseErrorInterceptor = rejected as (error: object) => Promise<never>;
          }),
        },
      },
      defaults: { headers: {} },
      request: vi.fn(),
    } as ReturnType<typeof axios.create>);

    createApiClient({ onUnauthorized });

    if (!capturedResponseErrorInterceptor) {
      throw new Error('Response interceptor was not captured');
    }

    const error = {
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: {
          error: 'Session expired',
        },
      },
    };

    await expect(capturedResponseErrorInterceptor(error)).rejects.toMatchObject({
      message: 'Session expired',
    });
    expect(onUnauthorized).toHaveBeenCalledWith(expect.objectContaining({ message: 'Session expired' }));
  });

  it('refreshes CSRF tokens and retries once on a CSRF 403', async () => {
    let capturedResponseErrorInterceptor: ((error: object) => Promise<unknown>) | null = null;
    const request = vi.fn().mockResolvedValue({ data: { ok: true } });

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_, rejected) => {
            capturedResponseErrorInterceptor = rejected as (error: object) => Promise<unknown>;
          }),
        },
      },
      defaults: { headers: {} },
      request,
    } as ReturnType<typeof axios.create>);
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { csrfToken: 'refreshed-csrf' },
    });

    createApiClient({ onUnauthorized: vi.fn(), baseURL: '/api' });

    if (!capturedResponseErrorInterceptor) {
      throw new Error('Response interceptor was not captured');
    }

    const error = {
      message: 'Request failed with status code 403',
      response: {
        status: 403,
        data: {
          error: {
            message: 'CSRF token expired',
          },
        },
      },
      config: {
        method: 'post',
        headers: {},
      },
    };

    await expect(capturedResponseErrorInterceptor(error)).resolves.toEqual({
      data: { ok: true },
    });
    expect(axios.get).toHaveBeenCalledWith('/api/v2/auth/csrf-token', { withCredentials: true });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        _retryCount: 1,
        headers: expect.objectContaining({
          'X-CSRF-Token': 'refreshed-csrf',
        }),
      })
    );
  });

  it('retries retryable network failures before returning the retried response', async () => {
    vi.useFakeTimers();
    let capturedResponseErrorInterceptor: ((error: object) => Promise<unknown>) | null = null;
    const request = vi.fn().mockResolvedValue({ data: { retried: true } });

    vi.mocked(axios.create).mockReturnValueOnce({
      interceptors: {
        request: { use: vi.fn() },
        response: {
          use: vi.fn((_, rejected) => {
            capturedResponseErrorInterceptor = rejected as (error: object) => Promise<unknown>;
          }),
        },
      },
      defaults: { headers: {} },
      request,
    } as ReturnType<typeof axios.create>);

    createApiClient({
      onUnauthorized: vi.fn(),
      retryConfig: {
        maxRetries: 1,
        baseDelayMs: 0,
        maxDelayMs: 0,
        retryableStatuses: [500],
      },
    });

    if (!capturedResponseErrorInterceptor) {
      throw new Error('Response interceptor was not captured');
    }

    const error = {
      message: 'Network failure',
      code: 'ERR_NETWORK',
      config: {
        method: 'get',
        headers: {},
      },
    };

    const retryPromise = capturedResponseErrorInterceptor(error);
    await vi.runAllTimersAsync();

    await expect(retryPromise).resolves.toEqual({ data: { retried: true } });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        _retryCount: 1,
      })
    );
  });

  it('creates abortable request controllers for cancellable flows', () => {
    const controller = createRequestController();
    expect(controller.signal.aborted).toBe(false);

    controller.cancel();
    expect(controller.signal.aborted).toBe(true);

    const requestFn = vi.fn().mockResolvedValue('ok');
    const { request, cancel } = createCancellableRequest(requestFn, '/endpoint', {
      method: 'get',
    });

    expect(requestFn).toHaveBeenCalledWith(
      '/endpoint',
      expect.objectContaining({
        method: 'get',
        signal: expect.any(AbortSignal),
      })
    );

    cancel();
    expect((requestFn.mock.calls[0]?.[1] as { signal?: AbortSignal } | undefined)?.signal?.aborted).toBe(true);

    void request;
  });
});
