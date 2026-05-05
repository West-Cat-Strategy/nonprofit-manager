import { createHmac } from 'crypto';
import {
  createLocalCampaignBrowserViewToken,
  verifyLocalCampaignBrowserViewToken,
  type LocalCampaignBrowserViewTokenPayload,
} from '../services/browserViewTokenService';

const payload: LocalCampaignBrowserViewTokenPayload = {
  v: 1,
  runId: '11111111-1111-4111-8111-111111111111',
  provider: 'local_email',
};

const decodePayload = (token: string): Record<string, unknown> => {
  const [encodedPayload] = token.split('.');
  return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
};

const encodePayload = (candidate: Record<string, unknown>): string =>
  Buffer.from(JSON.stringify(candidate), 'utf8').toString('base64url');

const signPayload = (encodedPayload: string): string =>
  createHmac('sha256', process.env.JWT_SECRET ?? '')
    .update('communications.local-browser-view.v1')
    .update('.')
    .update(encodedPayload)
    .digest('base64url');

describe('browserViewTokenService', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-with-32-characters!!';
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('round-trips a canonical local campaign browser-view token', () => {
    const token = createLocalCampaignBrowserViewToken(payload);

    expect(verifyLocalCampaignBrowserViewToken(token)).toEqual(payload);
    expect(decodePayload(token)).toEqual(payload);
  });

  it('does not include recipient or email data in the token payload', () => {
    const token = createLocalCampaignBrowserViewToken(payload);

    expect(Object.keys(decodePayload(token)).sort()).toEqual(['provider', 'runId', 'v']);
  });

  it('rejects tampered signatures', () => {
    const token = createLocalCampaignBrowserViewToken(payload);
    const [encodedPayload, signature] = token.split('.');
    const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;

    expect(verifyLocalCampaignBrowserViewToken(`${encodedPayload}.${tamperedSignature}`)).toBeNull();
  });

  it.each([
    ['invalid version', { v: 2 }],
    ['malformed run id', { runId: 'not-a-uuid' }],
    ['wrong provider', { provider: 'mailchimp' }],
  ])('rejects %s payloads even when the signature matches the payload', (_label, override) => {
    const invalidPayload = encodePayload({
      ...payload,
      ...override,
    });
    const signature = signPayload(invalidPayload);

    expect(verifyLocalCampaignBrowserViewToken(`${invalidPayload}.${signature}`)).toBeNull();
  });

  it('rejects non-canonical payload encoding', () => {
    const token = createLocalCampaignBrowserViewToken(payload);
    const reorderedPayload = decodePayload(token);
    const nonCanonicalPayload = encodePayload({
      provider: reorderedPayload.provider,
      runId: reorderedPayload.runId,
      v: reorderedPayload.v,
    });
    const signature = signPayload(nonCanonicalPayload);

    expect(verifyLocalCampaignBrowserViewToken(`${nonCanonicalPayload}.${signature}`)).toBeNull();
  });
});
