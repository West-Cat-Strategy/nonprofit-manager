import { createHmac } from 'crypto';
import {
  createLocalUnsubscribeToken,
  verifyLocalUnsubscribeToken,
  type LocalUnsubscribeTokenPayload,
} from '../services/unsubscribeTokenService';

const payload: LocalUnsubscribeTokenPayload = {
  v: 1,
  runId: '11111111-1111-4111-8111-111111111111',
  recipientId: '22222222-2222-4222-8222-222222222222',
  emailHash: 'a'.repeat(64),
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
    .update('communications.local-unsubscribe.v1')
    .update('.')
    .update(encodedPayload)
    .digest('base64url');

describe('unsubscribeTokenService', () => {
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

  it('round-trips a canonical local unsubscribe token', () => {
    const token = createLocalUnsubscribeToken(payload);

    expect(verifyLocalUnsubscribeToken(token)).toEqual(payload);
  });

  it('rejects tampered signatures', () => {
    const token = createLocalUnsubscribeToken(payload);
    const [encodedPayload, signature] = token.split('.');
    const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;

    expect(verifyLocalUnsubscribeToken(`${encodedPayload}.${tamperedSignature}`)).toBeNull();
  });

  it.each([
    ['invalid version', { v: 2 }],
    ['malformed run id', { runId: 'not-a-uuid' }],
    ['malformed recipient id', { recipientId: 'not-a-uuid' }],
    ['malformed email hash', { emailHash: 'not-a-sha256-hash' }],
  ])('rejects %s payloads even when the signature matches the payload', (_label, override) => {
    const invalidPayload = encodePayload({
      ...payload,
      ...override,
    });
    const signature = signPayload(invalidPayload);

    expect(verifyLocalUnsubscribeToken(`${invalidPayload}.${signature}`)).toBeNull();
  });

  it('rejects non-canonical payload encoding', () => {
    const token = createLocalUnsubscribeToken(payload);
    const reorderedPayload = decodePayload(token);
    const nonCanonicalPayload = encodePayload({
      recipientId: reorderedPayload.recipientId,
      runId: reorderedPayload.runId,
      emailHash: reorderedPayload.emailHash,
      v: reorderedPayload.v,
    });
    const signature = signPayload(nonCanonicalPayload);

    expect(verifyLocalUnsubscribeToken(`${nonCanonicalPayload}.${signature}`)).toBeNull();
  });
});
