import { createCorsOptions, resolveTrustProxy } from '../../config/requestSecurity';

const invokeOriginCheck = (
  originCallback: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void,
  origin?: string
) =>
  new Promise<{ allowed: boolean; error: Error | null }>((resolve) => {
    originCallback(origin, (error, allowed) => {
      resolve({ allowed: Boolean(allowed), error });
    });
  });

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

  it('parses trust proxy values safely', () => {
    expect(resolveTrustProxy(undefined)).toBe(false);
    expect(resolveTrustProxy('true')).toBe(true);
    expect(resolveTrustProxy('false')).toBe(false);
    expect(resolveTrustProxy('2')).toBe(2);
    expect(resolveTrustProxy('loopback')).toBe('loopback');
  });
});
