import { createHmac, timingSafeEqual } from 'crypto';
import { getJwtSecret } from '@config/jwt';

export interface LocalUnsubscribeTokenPayload {
  v: 1;
  runId: string;
  recipientId: string;
  emailHash: string;
}

const TOKEN_VERSION = 1;
const SIGNING_CONTEXT = 'communications.local-unsubscribe.v1';
const EMAIL_HASH_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const canonicalize = (payload: LocalUnsubscribeTokenPayload): string =>
  JSON.stringify({
    v: TOKEN_VERSION,
    runId: payload.runId,
    recipientId: payload.recipientId,
    emailHash: payload.emailHash.toLowerCase(),
  });

const sign = (encodedPayload: string): Buffer =>
  createHmac('sha256', getJwtSecret())
    .update(SIGNING_CONTEXT)
    .update('.')
    .update(encodedPayload)
    .digest();

const isPayload = (value: unknown): value is LocalUnsubscribeTokenPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LocalUnsubscribeTokenPayload>;
  return (
    candidate.v === TOKEN_VERSION &&
    typeof candidate.runId === 'string' &&
    UUID_PATTERN.test(candidate.runId) &&
    typeof candidate.recipientId === 'string' &&
    UUID_PATTERN.test(candidate.recipientId) &&
    typeof candidate.emailHash === 'string' &&
    EMAIL_HASH_PATTERN.test(candidate.emailHash)
  );
};

export const createLocalUnsubscribeToken = (
  payload: LocalUnsubscribeTokenPayload
): string => {
  const normalizedPayload = JSON.parse(canonicalize(payload)) as LocalUnsubscribeTokenPayload;
  const encodedPayload = encode(canonicalize(normalizedPayload));
  return `${encodedPayload}.${sign(encodedPayload).toString('base64url')}`;
};

export const verifyLocalUnsubscribeToken = (
  token: string
): LocalUnsubscribeTokenPayload | null => {
  try {
    const [encodedPayload, encodedSignature] = token.split('.');
    if (!encodedPayload || !encodedSignature || token.split('.').length !== 2) {
      return null;
    }

    const providedSignature = Buffer.from(encodedSignature, 'base64url');
    const expectedSignature = sign(encodedPayload);
    if (
      providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(providedSignature, expectedSignature)
    ) {
      return null;
    }

    const parsed = JSON.parse(decode(encodedPayload)) as unknown;
    if (!isPayload(parsed)) {
      return null;
    }

    const expectedPayload = encode(canonicalize(parsed));
    if (expectedPayload !== encodedPayload) {
      return null;
    }

    return {
      v: TOKEN_VERSION,
      runId: parsed.runId,
      recipientId: parsed.recipientId,
      emailHash: parsed.emailHash.toLowerCase(),
    };
  } catch {
    return null;
  }
};
