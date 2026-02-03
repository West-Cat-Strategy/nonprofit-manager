const splitOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

export const getWebAuthnConfig = () => {
  const origins = splitOrigins(process.env.WEBAUTHN_ORIGIN).length
    ? splitOrigins(process.env.WEBAUTHN_ORIGIN)
    : splitOrigins(process.env.CORS_ORIGIN);
  const fallbackOrigin = origins[0] || 'http://localhost:5173';

  const rpID = process.env.WEBAUTHN_RP_ID || new URL(fallbackOrigin).hostname;
  const rpName = process.env.WEBAUTHN_RP_NAME || 'Nonprofit Manager';
  return { origins: origins.length ? origins : [fallbackOrigin], rpID, rpName };
};
