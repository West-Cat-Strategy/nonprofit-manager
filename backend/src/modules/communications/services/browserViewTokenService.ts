import { createHmac, timingSafeEqual } from 'crypto';
import { getJwtSecret } from '@config/jwt';

export interface LocalCampaignBrowserViewTokenPayload {
  v: 1;
  runId: string;
  provider: 'local_email';
}

const TOKEN_VERSION = 1;
const SIGNING_CONTEXT = 'communications.local-browser-view.v1';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const canonicalize = (payload: LocalCampaignBrowserViewTokenPayload): string =>
  JSON.stringify({
    v: TOKEN_VERSION,
    runId: payload.runId,
    provider: 'local_email',
  });

const sign = (encodedPayload: string): Buffer =>
  createHmac('sha256', getJwtSecret())
    .update(SIGNING_CONTEXT)
    .update('.')
    .update(encodedPayload)
    .digest();

const isPayload = (value: unknown): value is LocalCampaignBrowserViewTokenPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LocalCampaignBrowserViewTokenPayload>;
  return (
    candidate.v === TOKEN_VERSION &&
    typeof candidate.runId === 'string' &&
    UUID_PATTERN.test(candidate.runId) &&
    candidate.provider === 'local_email'
  );
};

export const createLocalCampaignBrowserViewToken = (
  payload: LocalCampaignBrowserViewTokenPayload
): string => {
  const normalizedPayload = JSON.parse(
    canonicalize(payload)
  ) as LocalCampaignBrowserViewTokenPayload;
  const encodedPayload = encode(canonicalize(normalizedPayload));
  return `${encodedPayload}.${sign(encodedPayload).toString('base64url')}`;
};

export const verifyLocalCampaignBrowserViewToken = (
  token: string
): LocalCampaignBrowserViewTokenPayload | null => {
  try {
    const parts = token.split('.');
    const [encodedPayload, encodedSignature] = parts;
    if (!encodedPayload || !encodedSignature || parts.length !== 2) {
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
      provider: 'local_email',
    };
  } catch {
    return null;
  }
};
