export const toBase64Url = (data: Buffer | Uint8Array): string => {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const fromBase64Url = (data: string): Buffer => {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
};

