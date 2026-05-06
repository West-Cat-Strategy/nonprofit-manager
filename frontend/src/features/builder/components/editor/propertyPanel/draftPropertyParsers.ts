export const parsePositiveNumberList = (value: string): number[] =>
  value
    .split(',')
    .map((entry) => Number.parseFloat(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

export const parseTrimmedStringList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const parseBoundedInteger = (
  value: string,
  fallback: number,
  min: number,
  max: number
): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
};
