import type { Request } from 'express';
import { rateLimitKeys } from '@utils/rateLimitKeys';

const buildRequest = (
  overrides: Partial<Request> & {
    user?: { id?: string };
    organizationId?: string;
    accountId?: string;
    tenantId?: string;
  } = {}
): Request => {
  return {
    ip: '203.0.113.10',
    connection: { remoteAddress: '203.0.113.10' } as Request['connection'],
    headers: {},
    body: {},
    ...overrides,
  } as Request;
};

describe('rateLimitKeys', () => {
  it('builds organization-scoped API keys when org context is present', () => {
    const req = buildRequest({
      user: { id: 'user-1' },
      organizationId: 'org-1',
    } as unknown as Partial<Request>);

    expect(rateLimitKeys.api(req)).toBe('rate-limit:org:org-1:api:user-1');
  });

  it('falls back to global API keys when org context is missing', () => {
    const req = buildRequest({
      user: { id: 'user-2' },
    } as unknown as Partial<Request>);

    expect(rateLimitKeys.api(req)).toBe('rate-limit:global:api:user-2');
  });

  it('uses organization headers when request context fields are absent', () => {
    const req = buildRequest({
      headers: {
        'x-organization-id': 'org-from-header',
      },
    });

    expect(rateLimitKeys.registration(req)).toBe(
      'rate-limit:org:org-from-header:registration:203.0.113.10'
    );
  });

  it('uses global auth key when no organization context is available', () => {
    const req = buildRequest({
      body: { email: 'person@example.com' },
    });

    expect(rateLimitKeys.auth(req)).toBe(
      'rate-limit:global:auth:person%40example.com%3A203.0.113.10'
    );
  });
});
