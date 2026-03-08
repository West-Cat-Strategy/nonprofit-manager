import request from 'supertest';
import app from '../../index';

const HEALTH_ALIAS_BASE_PATHS = ['/api/health', '/api/v2/health'] as const;
const originalOrgContextRequire = process.env.ORG_CONTEXT_REQUIRE;

const expectHealthPayloadShapeMatchesCanonical = (
  canonical: Record<string, unknown>,
  candidate: Record<string, unknown>
): void => {
  expect(Object.keys(candidate).sort()).toEqual(Object.keys(canonical).sort());

  if ('status' in canonical) {
    expect(candidate).toHaveProperty('status', canonical.status);
  }

  const canonicalChecks =
    'checks' in canonical && canonical.checks && typeof canonical.checks === 'object'
      ? (canonical.checks as Record<string, unknown>)
      : null;
  const candidateChecks =
    'checks' in candidate && candidate.checks && typeof candidate.checks === 'object'
      ? (candidate.checks as Record<string, unknown>)
      : null;

  if (canonicalChecks) {
    expect(candidateChecks).not.toBeNull();
    expect(Object.keys(candidateChecks ?? {}).sort()).toEqual(Object.keys(canonicalChecks).sort());
  }
};

describe('Health Route Alias Integration', () => {
  beforeAll(() => {
    process.env.ORG_CONTEXT_REQUIRE = 'true';
  });

  afterAll(() => {
    process.env.ORG_CONTEXT_REQUIRE = originalOrgContextRequire;
  });

  it('keeps root health aliases outside org-context and success-envelope middleware', async () => {
    const canonicalResponse = await request(app).get('/health').expect(200);

    expect(canonicalResponse.body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
    expect(canonicalResponse.body).not.toHaveProperty('success');

    for (const basePath of HEALTH_ALIAS_BASE_PATHS) {
      const aliasedResponse = await request(app).get(basePath).expect(200);

      expect(aliasedResponse.body).not.toHaveProperty('success');
      expectHealthPayloadShapeMatchesCanonical(
        canonicalResponse.body as Record<string, unknown>,
        aliasedResponse.body as Record<string, unknown>
      );
    }
  });

  it('keeps live health aliases outside org-context and tombstone middleware', async () => {
    const canonicalResponse = await request(app).get('/health/live').expect(200);

    expect(canonicalResponse.body).toEqual({ status: 'alive' });

    for (const basePath of HEALTH_ALIAS_BASE_PATHS) {
      const aliasedResponse = await request(app).get(`${basePath}/live`).expect(200);

      expect(aliasedResponse.body).toEqual(canonicalResponse.body);
      expect(aliasedResponse.body).not.toHaveProperty('success');
    }
  });

  it.each(['/ready', '/detailed'])(
    'matches canonical payload shape for aliased health route "%s"',
    async (suffix) => {
      const canonicalResponse = await request(app).get(`/health${suffix}`);

      expect([200, 503]).toContain(canonicalResponse.status);
      expect(canonicalResponse.body).not.toHaveProperty('success');

      for (const basePath of HEALTH_ALIAS_BASE_PATHS) {
        const aliasedResponse = await request(app).get(`${basePath}${suffix}`);

        expect(aliasedResponse.status).toBe(canonicalResponse.status);
        expect(aliasedResponse.status).not.toBe(400);
        expect(aliasedResponse.status).not.toBe(410);
        expect(aliasedResponse.body).not.toHaveProperty('success');
        expectHealthPayloadShapeMatchesCanonical(
          canonicalResponse.body as Record<string, unknown>,
          aliasedResponse.body as Record<string, unknown>
        );
      }
    }
  );
});
