import type {
  FieldMatchCandidate,
  IngestDataset,
  SchemaMatchSuggestion,
  SchemaTable,
  TableMatchSuggestion,
} from './types';
import { typeCompatibilityScore } from './infer';
import { clamp, normalizeName, safeRatio, uniq } from './utils';

function bigrams(s: string): string[] {
  const v = s.replace(/_/g, ' ').trim();
  if (v.length < 2) return v ? [v] : [];
  const out: string[] = [];
  for (let i = 0; i < v.length - 1; i++) out.push(v.slice(i, i + 2));
  return out;
}

function diceCoefficient(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.length === 0 || B.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const x of A) counts.set(x, (counts.get(x) ?? 0) + 1);
  let matches = 0;
  for (const y of B) {
    const c = counts.get(y) ?? 0;
    if (c > 0) {
      matches++;
      counts.set(y, c - 1);
    }
  }
  return (2 * matches) / (A.length + B.length);
}

function tokenize(name: string): string[] {
  return normalizeName(name)
    .split('_')
    .map((t) => t.trim())
    .filter(Boolean);
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  const inter = Array.from(A).filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

function nameSimilarity(source: string, target: string): number {
  const s = normalizeName(source);
  const t = normalizeName(target);
  if (!s || !t) return 0;
  if (s === t) return 1;
  const tokenScore = jaccard(tokenize(s), tokenize(t));
  const dice = diceCoefficient(s, t);
  const substring = s.includes(t) || t.includes(s) ? 0.8 : 0;
  return clamp(0.5 * dice + 0.4 * tokenScore + 0.1 * substring, 0, 1);
}

function fieldNameAndAliases(field: { field: string; aliases?: string[] }): string[] {
  return uniq([field.field, ...(field.aliases ?? [])]).filter(Boolean);
}

function isIdField(field: string): boolean {
  const t = tokenize(field);
  return t.length > 0 && (t[t.length - 1] === 'id' || field === 'id');
}

function valueHintScore(params: {
  inferredType: string;
  sourceName: string;
  targetField: string;
  nonEmptyRatio: number;
  uniqueRatio: number;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const srcTokens = tokenize(params.sourceName);
  const tgtTokens = tokenize(params.targetField);
  const hasAny = (tokens: string[], needles: string[]) => needles.some((n) => tokens.includes(n));

  if (params.inferredType === 'email' && hasAny(tgtTokens, ['email'])) {
    score += 0.28;
    reasons.push('Value pattern looks like email.');
  }
  if (params.inferredType === 'phone' && hasAny(tgtTokens, ['phone', 'mobile', 'cell', 'tel'])) {
    score += 0.28;
    reasons.push('Value pattern looks like phone.');
  }
  if ((params.inferredType === 'currency' || params.inferredType === 'number') && hasAny(tgtTokens, ['amount', 'total', 'hours', 'count'])) {
    score += 0.2;
    reasons.push('Numeric values fit numeric target field.');
  }
  if ((params.inferredType === 'date' || params.inferredType === 'datetime') && hasAny(tgtTokens, ['date', 'time', 'at'])) {
    score += 0.2;
    reasons.push('Date/time values fit date/time target field.');
  }

  // Identity fields tend to be highly unique and mostly non-empty.
  if (isIdField(params.targetField)) {
    if (params.inferredType === 'uuid' && params.uniqueRatio >= 0.9 && params.nonEmptyRatio >= 0.8) {
      score += 0.25;
      reasons.push('High uniqueness + UUID-like values suggest an identifier field.');
    } else if (params.uniqueRatio < 0.5 && params.nonEmptyRatio >= 0.5) {
      score -= 0.15;
      reasons.push('Low uniqueness makes this less likely to be an identifier field.');
    }
  }

  if (hasAny(srcTokens, ['first']) && hasAny(tgtTokens, ['first'])) {
    score += 0.15;
    reasons.push('Column name indicates first name.');
  }
  if (hasAny(srcTokens, ['last']) && hasAny(tgtTokens, ['last'])) {
    score += 0.15;
    reasons.push('Column name indicates last name.');
  }

  return { score: clamp(score, -0.25, 0.5), reasons };
}

export interface MatchOptions {
  perColumnCandidates?: number;
  minCandidateScore?: number;
  minAcceptedMappingScore?: number;
}

export function suggestSchemaMatches(
  dataset: IngestDataset,
  tables: SchemaTable[],
  options: MatchOptions = {}
): SchemaMatchSuggestion {
  const perColumnCandidates = options.perColumnCandidates ?? 6;
  const minCandidateScore = options.minCandidateScore ?? 0.22;
  const minAcceptedMappingScore = options.minAcceptedMappingScore ?? 0.55;

  const tableSuggestions: TableMatchSuggestion[] = [];
  const datasetTokens = tokenize(dataset.name);

  for (const table of tables) {
    const reasons: string[] = [];

    const columnSuggestions = dataset.columns.map((col) => {
      const candidates: FieldMatchCandidate[] = [];
      for (const field of table.fields) {
        const aliasNames = fieldNameAndAliases(field);
        const bestNameScore = Math.max(...aliasNames.map((n) => nameSimilarity(col.name, n)));
        const typeScore = typeCompatibilityScore(col.inferredType, field.type);
        const hint = valueHintScore({
          inferredType: col.inferredType,
          sourceName: col.name,
          targetField: field.field,
          nonEmptyRatio: col.nonEmptyRatio ?? safeRatio(col.nonEmptyCount, Math.max(1, col.nonEmptyCount + col.nullishCount)),
          uniqueRatio: col.uniqueRatio ?? safeRatio(col.uniqueCount, Math.max(1, col.nonEmptyCount)),
        });

        // Weighted score: name dominates, then type, then value/uniqueness hints.
        let score = 0.62 * bestNameScore + 0.28 * typeScore + 0.1 * clamp(hint.score, 0, 1);
        // Allow negative hint to penalize some matches (e.g. low-unique id fields)
        if (hint.score < 0) score += 0.08 * hint.score;

        const candidateReasons: string[] = [];
        if (bestNameScore >= 0.85) candidateReasons.push('Column name closely matches target field.');
        else if (bestNameScore >= 0.6) candidateReasons.push('Column name is similar to target field.');

        if (typeScore >= 0.9) candidateReasons.push('Inferred type is compatible.');
        else if (typeScore <= 0.25) candidateReasons.push('Inferred type may be incompatible.');

        candidateReasons.push(...hint.reasons);

        if (score >= minCandidateScore) {
          candidates.push({ table: table.table, field: field.field, score: clamp(score, 0, 1), reasons: candidateReasons });
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      return {
        sourceColumn: col.name,
        candidates: candidates.slice(0, perColumnCandidates),
      };
    });

    // Greedy assignment (1:1 fields) with a slight preference for higher-confidence columns.
    const usedTargets = new Set<string>();
    const suggestedMapping: Record<string, string> = {};
    const acceptedScores: number[] = [];

    const columnsByStrength = [...dataset.columns]
      .map((c) => ({
        name: c.name,
        strength: (c.nonEmptyRatio ?? safeRatio(c.nonEmptyCount, Math.max(1, c.nonEmptyCount + c.nullishCount))) *
          (0.6 + 0.4 * (c.inferredTypeConfidence ?? 0.5)),
      }))
      .sort((a, b) => b.strength - a.strength);

    const suggestionByColumn = new Map(columnSuggestions.map((s) => [s.sourceColumn, s]));

    for (const col of columnsByStrength) {
      const suggestion = suggestionByColumn.get(col.name);
      if (!suggestion) continue;
      const best = suggestion.candidates[0];
      if (!best) continue;
      if (best.score < minAcceptedMappingScore) continue;
      const key = `${best.table}.${best.field}`;
      if (usedTargets.has(key)) continue;
      usedTargets.add(key);
      suggestedMapping[suggestion.sourceColumn] = key;
      acceptedScores.push(best.score);
    }

    const coverage =
      dataset.columns.length === 0 ? 0 : acceptedScores.length / Math.max(1, dataset.columns.length);
    const avgScore =
      acceptedScores.length === 0 ? 0 : acceptedScores.reduce((a, b) => a + b, 0) / acceptedScores.length;

    const requiredFields = table.fields.filter((f) => f.required).map((f) => `${table.table}.${f.field}`);
    const matchedTargets = new Set(Object.values(suggestedMapping));
    const requiredMatched = requiredFields.filter((f) => matchedTargets.has(f)).length;
    const requiredCoverage = safeRatio(requiredMatched, Math.max(1, requiredFields.length));

    if (requiredFields.length > 0 && requiredCoverage < 1) {
      reasons.push(`Missing ${requiredFields.length - requiredMatched} required field(s) for ${table.table}.`);
    } else if (requiredFields.length > 0) {
      reasons.push('All required fields can be mapped at high confidence.');
    }

    // Bonus if dataset name hints this table
    const tableNames = uniq([table.table, table.label, ...(table.aliases ?? [])]);
    const tableNameSimilarity = Math.max(...tableNames.map((n) => jaccard(datasetTokens, tokenize(n))));
    if (tableNameSimilarity >= 0.3) reasons.push('Dataset name suggests this table.');

    // Final table score: match quality, coverage, required coverage, plus name hint.
    const score = clamp(avgScore * 0.62 + coverage * 0.22 + requiredCoverage * 0.14 + (tableNameSimilarity >= 0.3 ? 0.02 : 0), 0, 1);

    if (acceptedScores.length > 0) {
      reasons.push(`Mapped ${acceptedScores.length} of ${dataset.columns.length} columns.`);
    }

    tableSuggestions.push({
      table: table.table,
      score,
      coverage,
      suggestedMapping,
      columnSuggestions,
      reasons,
    });
  }

  tableSuggestions.sort((a, b) => b.score - a.score);
  const bestTable = tableSuggestions[0] && tableSuggestions[0].score > 0 ? tableSuggestions[0] : undefined;

  return {
    datasetName: dataset.name,
    bestTable,
    tables: tableSuggestions,
  };
}

