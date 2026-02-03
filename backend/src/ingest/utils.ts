export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '') // BOM
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function take<T>(values: T[], limit: number): T[] {
  if (values.length <= limit) return values;
  return values.slice(0, limit);
}

export function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

export function splitSqlListTopLevel(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

