import {
  createCorsOptions,
  createCorsOptionsDelegate,
  resolveTrustProxy,
  shouldEnableUpgradeInsecureRequests,
} from '../../config/requestSecurity';

const invokeOriginCheck = (
  originCallback: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void,
  origin?: string
) =>
  new Promise<{ allowed: boolean; error: Error | null }>((resolve) => {
    originCallback(origin, (error, allowed) => {
      resolve({ allowed: Boolean(allowed), error });
    });
  });

const invokeDelegateOriginCheck = async (
  delegate: ReturnType<typeof createCorsOptionsDelegate>,
  input: { protocol?: string; headers?: Record<string, string | undefined> },
  origin?: string
) => {
  const request = {
    protocol: input.protocol || 'https',
    get: (name: string) => input.headers?.[name.toLowerCase()],
  } as any;

  const options = await new Promise<any>((resolve, reject) => {
    delegate(request, (error, value) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(value);
    });
  });

  return invokeOriginCheck(options.origin as any, origin);
};

describe('requestSecurity helpers', () => {
  it('fails closed when wildcard origins are combined with credentials outside development', () => {
    expect(() =>
      createCorsOptions({
        nodeEnv: 'production',
        corsOrigin: '*',
        fallbackOrigins: ['http://localhost:5173'],
      })
    ).toThrow('CORS_ORIGIN cannot include "*" when credentials are enabled outside development');
  });

  it('allows explicit production allowlists and rejects unknown origins', async () => {
    const corsOptions = createCorsOptions({
      nodeEnv: 'production',
      corsOrigin: 'https://westcat.ca,https://admin.westcat.ca',
      fallbackOrigins: ['http://localhost:5173'],
    });

    const allowed = await invokeOriginCheck(corsOptions.origin as any, 'https://westcat.ca');
    const denied = await invokeOriginCheck(corsOptions.origin as any, 'https://evil.example');

    expect(corsOptions.credentials).toBe(true);
    expect(allowed).toEqual({ allowed: true, error: null });
    expect(denied.allowed).toBe(false);
    expect(denied.error).toBeInstanceOf(Error);
    expect(denied.error?.message).toBe('Not allowed by CORS');
  });

  it('keeps development wildcard allowlists working for local testing', async () => {
    const corsOptions = createCorsOptions({
      nodeEnv: 'development',
      corsOrigin: '*',
      fallbackOrigins: ['http://localhost:5173'],
    });

    const allowed = await invokeOriginCheck(corsOptions.origin as any, 'https://untrusted.example');

    expect(allowed).toEqual({ allowed: true, error: null });
  });

  it('denies production origins that only match the request host', async () => {
    const delegate = createCorsOptionsDelegate({
      nodeEnv: 'production',
      corsOrigin: 'https://admin.westcat.ca',
      fallbackOrigins: ['http://localhost:5173'],
    });

    const denied = await invokeDelegateOriginCheck(
      delegate,
      {
        protocol: 'https',
        headers: {
          host: 'community.westcat.ca',
        },
      },
      'https://community.westcat.ca'
    );

    expect(denied.allowed).toBe(false);
    expect(denied.error?.message).toBe('Not allowed by CORS');
  });

  it('denies spoofed forwarded-host origins when they are not explicitly allowed', async () => {
    const delegate = createCorsOptionsDelegate({
      nodeEnv: 'production',
      corsOrigin: 'https://admin.westcat.ca',
      fallbackOrigins: ['http://localhost:5173'],
    });

    const denied = await invokeDelegateOriginCheck(
      delegate,
      {
        protocol: 'https',
        headers: {
          host: 'api.westcat.ca',
          'x-forwarded-host': 'community.westcat.ca',
          'x-forwarded-proto': 'https',
        },
      },
      'https://community.westcat.ca'
    );

    expect(denied.allowed).toBe(false);
    expect(denied.error?.message).toBe('Not allowed by CORS');
  });

  it('allows request-host origins when explicitly enabled for the public runtime', async () => {
    const delegate = createCorsOptionsDelegate({
      nodeEnv: 'production',
      corsOrigin: 'https://admin.westcat.ca',
      fallbackOrigins: ['http://localhost:5173'],
      allowRequestHostOrigin: true,
    });

    const allowed = await invokeDelegateOriginCheck(
      delegate,
      {
        protocol: 'https',
        headers: {
          host: 'community.westcat.ca',
        },
      },
      'https://community.westcat.ca'
    );

    expect(allowed).toEqual({ allowed: true, error: null });
  });

  it('parses trust proxy values safely', () => {
    expect(resolveTrustProxy(undefined)).toBe(false);
    expect(resolveTrustProxy('true')).toBe(true);
    expect(resolveTrustProxy('false')).toBe(false);
    expect(resolveTrustProxy('2')).toBe(2);
    expect(resolveTrustProxy('loopback')).toBe('loopback');
  });

  it('disables upgrade-insecure-requests when production uses loopback origins', () => {
    expect(
      shouldEnableUpgradeInsecureRequests({
        nodeEnv: 'production',
        origins: ['http://localhost:3000', 'http://localhost:5173'],
      })
    ).toBe(false);

    expect(
      shouldEnableUpgradeInsecureRequests({
        nodeEnv: 'production',
        origins: ['https://community-demo.localhost:3001'],
      })
    ).toBe(false);
  });

  it('keeps upgrade-insecure-requests enabled for non-local production origins', () => {
    expect(
      shouldEnableUpgradeInsecureRequests({
        nodeEnv: 'production',
        origins: ['https://api.westcat.ca', 'https://admin.westcat.ca'],
      })
    ).toBe(true);
  });
});
