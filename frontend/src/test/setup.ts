import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

type ApiMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export type TestApiRequest = {
  method: ApiMethod;
  url: string;
  resolvedUrl: string;
  data: unknown;
  config: unknown;
  args: unknown[];
};

export type TestApiMatcher =
  | string
  | RegExp
  | ((request: TestApiRequest) => boolean);

type TestApiResponse =
  | unknown
  | ((request: TestApiRequest) => unknown | Promise<unknown>);

const apiMockState = vi.hoisted(() => {
  const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

  type InternalApiMethod = (typeof methods)[number];
  type InternalApiRequest = {
    method: InternalApiMethod;
    url: string;
    resolvedUrl: string;
    data: unknown;
    config: unknown;
    args: unknown[];
  };
  type InternalApiMatcher =
    | string
    | RegExp
    | ((request: InternalApiRequest) => boolean);

  const registrations: Array<{
    id: number;
    method: InternalApiMethod;
    matcher: InternalApiMatcher;
    handler: (request: InternalApiRequest) => unknown | Promise<unknown>;
  }> = [];
  const calls: InternalApiRequest[] = [];

  let nextRegistrationId = 1;

  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const appendQueryParams = (url: string, params: Record<string, unknown>) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined && entry !== null) {
            searchParams.append(key, String(entry));
          }
        });
        return;
      }

      searchParams.append(key, String(value));
    });

    const serialized = searchParams.toString();

    if (!serialized) {
      return url;
    }

    return `${url}${url.includes('?') ? '&' : '?'}${serialized}`;
  };

  const toResolvedUrl = (url: string, args: unknown[], method: InternalApiMethod) => {
    const configCandidate =
      method === 'get' || method === 'delete' ? args[0] : args[1];

    if (
      !isPlainObject(configCandidate) ||
      !('params' in configCandidate) ||
      !isPlainObject(configCandidate.params)
    ) {
      return url;
    }

    return appendQueryParams(url, configCandidate.params);
  };

  const createRequest = (
    method: InternalApiMethod,
    url: string,
    args: unknown[]
  ): InternalApiRequest => {
    const data =
      method === 'get' || method === 'delete' ? undefined : args[0];
    const config =
      method === 'get' || method === 'delete' ? args[0] : args[1];

    return {
      method,
      url,
      resolvedUrl: toResolvedUrl(url, args, method),
      data,
      config,
      args,
    };
  };

  const matches = (matcher: InternalApiMatcher, request: InternalApiRequest) => {
    if (typeof matcher === 'string') {
      return matcher === request.url || matcher === request.resolvedUrl;
    }

    if (matcher instanceof RegExp) {
      matcher.lastIndex = 0;
      return matcher.test(request.resolvedUrl);
    }

    return matcher(request);
  };

  const handleRequest = (
    method: InternalApiMethod,
    url: string,
    args: unknown[]
  ) => {
    const request = createRequest(method, url, args);
    calls.push(request);

    for (let index = registrations.length - 1; index >= 0; index -= 1) {
      const registration = registrations[index];
      if (registration.method !== method || !matches(registration.matcher, request)) {
        continue;
      }

      try {
        return Promise.resolve(registration.handler(request));
      } catch (error) {
        return Promise.reject(error);
      }
    }

    throw new Error(`[test api] Unregistered ${method.toUpperCase()} ${request.resolvedUrl}`);
  };

  const mockApi = Object.fromEntries(
    methods.map((method) => [
      method,
      vi.fn((url: string, ...args: unknown[]) => handleRequest(method, url, args)),
    ])
  ) as Record<InternalApiMethod, ReturnType<typeof vi.fn>>;

  const restoreDefaultImplementations = () => {
    methods.forEach((method) => {
      mockApi[method].mockReset();
      mockApi[method].mockImplementation((url: string, ...args: unknown[]) =>
        handleRequest(method, url, args)
      );
    });
  };

  return {
    mockApi,
    reset: () => {
      registrations.length = 0;
      calls.length = 0;
      nextRegistrationId = 1;
      restoreDefaultImplementations();
    },
    register: (
      method: InternalApiMethod,
      matcher: InternalApiMatcher,
      handler: (request: InternalApiRequest) => unknown | Promise<unknown>
    ) => {
      const id = nextRegistrationId;
      nextRegistrationId += 1;
      registrations.push({ id, method, matcher, handler });
      return id;
    },
    unregister: (id: number) => {
      const index = registrations.findIndex((registration) => registration.id === id);
      if (index >= 0) {
        registrations.splice(index, 1);
      }
    },
    getCalls: (
      method?: InternalApiMethod,
      matcher?: InternalApiMatcher
    ) =>
      calls
        .filter((request) => {
          if (method && request.method !== method) {
            return false;
          }
          if (!matcher) {
            return true;
          }
          return matches(matcher, request);
        })
        .map((request) => ({ ...request, args: [...request.args] })),
  };
});

export const resetTestApiRegistry = () => {
  apiMockState.reset();
};

export const registerTestApiCall = (
  method: ApiMethod,
  matcher: TestApiMatcher,
  response: TestApiResponse
) => {
  const handler =
    typeof response === 'function'
      ? (response as (request: TestApiRequest) => unknown | Promise<unknown>)
      : () => response;

  const registrationId = apiMockState.register(method, matcher, handler);

  return {
    unregister: () => apiMockState.unregister(registrationId),
    getCalls: () => apiMockState.getCalls(method, matcher),
  };
};

export const registerTestApiGet = (
  matcher: TestApiMatcher,
  response: TestApiResponse
) => registerTestApiCall('get', matcher, response);

export const registerTestApiPost = (
  matcher: TestApiMatcher,
  response: TestApiResponse
) => registerTestApiCall('post', matcher, response);

export const registerTestApiPut = (
  matcher: TestApiMatcher,
  response: TestApiResponse
) => registerTestApiCall('put', matcher, response);

export const registerTestApiDelete = (
  matcher: TestApiMatcher,
  response: TestApiResponse
) => registerTestApiCall('delete', matcher, response);

export const registerTestApiPatch = (
  matcher: TestApiMatcher,
  response: TestApiResponse
) => registerTestApiCall('patch', matcher, response);

export const getTestApiCalls = (
  method?: ApiMethod,
  matcher?: TestApiMatcher
) => apiMockState.getCalls(method, matcher);

vi.mock('../services/api', () => ({
  default: apiMockState.mockApi,
}));

beforeEach(() => {
  resetTestApiRegistry();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

class EventSourceMock {
  url: string;
  withCredentials: boolean;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string | URL, init?: EventSourceInit) {
    this.url = String(url);
    this.withCredentials = init?.withCredentials ?? false;
  }

  addEventListener() {}
  removeEventListener() {}
  close() {}
}

Object.defineProperty(globalThis, 'EventSource', {
  value: EventSourceMock,
  configurable: true,
});

Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  configurable: true,
});

class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 1024,
            height: 768,
            top: 0,
            left: 0,
            right: 1024,
            bottom: 768,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      this
    );
  }

  unobserve() { }
  disconnect() { }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
  configurable: true,
});

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => ({
    width: 1024,
    height: 768,
    top: 0,
    left: 0,
    right: 1024,
    bottom: 768,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }),
});
