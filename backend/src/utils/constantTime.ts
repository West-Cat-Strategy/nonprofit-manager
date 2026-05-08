import crypto from 'crypto';

export const timingSafeEqualString = (candidate: string, expected: string): boolean => {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  const compareLength = Math.max(candidateBuffer.length, expectedBuffer.length, 1);
  const paddedCandidate = Buffer.alloc(compareLength);
  const paddedExpected = Buffer.alloc(compareLength);

  candidateBuffer.copy(paddedCandidate);
  expectedBuffer.copy(paddedExpected);

  return (
    crypto.timingSafeEqual(paddedCandidate, paddedExpected) &&
    candidateBuffer.length === expectedBuffer.length
  );
};

export const singleHeaderValue = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : null;
