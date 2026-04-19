import speakeasy from 'speakeasy';

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_WINDOW = 1;
const TOTP_SECRET_LENGTH = 10;

export const normalizeTotpCode = (code: string): string => code.replace(/\s+/g, '');

export const enrollTotpSecret = (
  email: string,
  issuer: string
): { secret: string; otpauthUrl: string } => {
  const generated = speakeasy.generateSecret({
    length: TOTP_SECRET_LENGTH,
  });
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);

  return {
    secret: generated.base32,
    otpauthUrl: `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${generated.base32}&period=${TOTP_PERIOD_SECONDS}&issuer=${encodedIssuer}`,
  };
};

export const verifyTotpCode = (secret: string, code: string): boolean =>
  speakeasy.totp.verify({
    secret,
    token: normalizeTotpCode(code),
    encoding: 'base32',
    step: TOTP_PERIOD_SECONDS,
    window: TOTP_WINDOW,
  });

export const generateTotpCodeForTest = (secret: string): string =>
  speakeasy.totp({
    secret,
    encoding: 'base32',
    step: TOTP_PERIOD_SECONDS,
  });
