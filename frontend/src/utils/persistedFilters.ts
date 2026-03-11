const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const safeParseStoredObject = <T extends Record<string, unknown>>(
  value: string | null
): Partial<T> | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? (parsed as Partial<T>) : null;
  } catch {
    return null;
  }
};

const toInteger = (value: string | number | null | undefined): number | undefined => {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
};

export const parsePositiveInteger = (
  value: string | number | null | undefined,
  fallback: number
): number => {
  const parsed = toInteger(value);
  return parsed && parsed > 0 ? parsed : fallback;
};

export const parseOptionalPositiveInteger = (
  value: string | number | null | undefined
): number | undefined => {
  const parsed = toInteger(value);
  return parsed && parsed > 0 ? parsed : undefined;
};

export const parseAllowedValue = <T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
};

export const parseAllowedValueOrEmpty = <T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | '' => {
  return parseAllowedValue(value, allowed) ?? '';
};
