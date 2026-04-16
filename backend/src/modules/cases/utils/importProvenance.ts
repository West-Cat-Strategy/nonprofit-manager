import type {
  CaseProvenance,
  CaseProvenanceSourceRoleBreakdown,
  PortalCaseProvenance,
} from '@app-types/case';

type RecordLike = Record<string, unknown>;

const CONFIDENCE_HIGH_THRESHOLD = 0.9;
const CONFIDENCE_LOW_THRESHOLD = 0.75;

const isRecord = (value: unknown): value is RecordLike => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

export interface ImportedCaseProvenanceSourceRow {
  sourceTable: string;
  sourceRowId: string;
  recordType: string | null;
}

export interface ImportedCaseProvenanceInput {
  clusterId: string;
  primaryLabel: string;
  recordType: string;
  sourceTables: string[];
  sourceFiles: string[];
  sourceRowIds: string[];
  participantIds: string[];
  sourceTypeBreakdown: string[];
  linkConfidence: number | null;
  sourceRows: ImportedCaseProvenanceSourceRow[];
}

const splitDelimitedValues = (value: string): string[] =>
  value
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return uniqueStrings(
      value.flatMap((item) => {
        if (typeof item === 'string') {
          return splitDelimitedValues(item);
        }
        if (typeof item === 'number' && Number.isFinite(item)) {
          return [String(item)];
        }
        return [];
      })
    );
  }

  if (typeof value === 'string') {
    return uniqueStrings(splitDelimitedValues(value));
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return [String(value)];
  }

  return [];
};

const readField = (records: Array<RecordLike | null | undefined>, keys: string[]): unknown => {
  for (const record of records) {
    if (!record) {
      continue;
    }

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        const value = record[key];
        if (value !== undefined) {
          return value;
        }
      }
    }
  }

  return undefined;
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const readText = (records: Array<RecordLike | null | undefined>, keys: string[]): string | null => {
  return normalizeText(readField(records, keys));
};

const readNumber = (records: Array<RecordLike | null | undefined>, keys: string[]): number | null => {
  const raw = readField(records, keys);
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const readBoolean = (records: Array<RecordLike | null | undefined>, keys: string[]): boolean | null => {
  const raw = readField(records, keys);
  if (typeof raw === 'boolean') {
    return raw;
  }

  if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'true') return true;
    if (raw.toLowerCase() === 'false') return false;
  }

  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
  }

  return null;
};

const normalizeConfidenceLabelFromLinkConfidence = (
  linkConfidence: number | null
): CaseProvenance['confidence_label'] => {
  if (linkConfidence === null) {
    return 'unknown';
  }

  if (linkConfidence >= CONFIDENCE_HIGH_THRESHOLD) {
    return 'high';
  }

  if (linkConfidence >= CONFIDENCE_LOW_THRESHOLD) {
    return 'medium';
  }

  return 'low';
};

const normalizeConfidenceLabel = (
  label: string | null,
  confidence: number | null
): CaseProvenance['confidence_label'] => {
  const normalized = label?.toLowerCase().trim();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low' || normalized === 'unknown') {
    return normalized;
  }

  if (confidence === null) {
    return 'unknown';
  }

  if (confidence >= CONFIDENCE_HIGH_THRESHOLD) {
    return 'high';
  }

  if (confidence >= CONFIDENCE_LOW_THRESHOLD) {
    return 'medium';
  }

  return 'low';
};

const normalizeRoleBreakdownEntry = (
  value: unknown
): CaseProvenanceSourceRoleBreakdown | null => {
  if (typeof value === 'string') {
    const sourceRole = value.trim();
    if (!sourceRole) {
      return null;
    }

    return {
      source_role: sourceRole,
      source_tables: [],
      source_row_count: 0,
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const sourceRole =
    readText([value], ['source_role', 'sourceRole']) ??
    readText([value], ['record_type', 'recordType']) ??
    null;

  if (!sourceRole) {
    return null;
  }

  const sourceTables = normalizeStringArray(readField([value], ['source_tables', 'sourceTables']));
  const sourceRowIds = normalizeStringArray(readField([value], ['source_row_ids', 'sourceRowIds']));
  const sourceRowCount =
    readNumber([value], ['source_row_count', 'sourceRowCount']) ?? sourceRowIds.length ?? 0;

  return {
    source_role: sourceRole,
    source_tables: sourceTables,
    source_row_count: sourceRowCount,
    ...(sourceRowIds.length > 0 ? { source_row_ids: sourceRowIds } : {}),
  };
};

const normalizeRoleBreakdown = (value: unknown): CaseProvenanceSourceRoleBreakdown[] => {
  const rawEntries = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];
  const byRole = new Map<string, CaseProvenanceSourceRoleBreakdown>();

  for (const entry of rawEntries) {
    const normalized = normalizeRoleBreakdownEntry(entry);
    if (!normalized) {
      continue;
    }

    const existing = byRole.get(normalized.source_role);
    if (!existing) {
      byRole.set(normalized.source_role, normalized);
      continue;
    }

    const sourceTables = uniqueStrings([...existing.source_tables, ...normalized.source_tables]);
    const sourceRowIds = uniqueStrings([
      ...(existing.source_row_ids ?? []),
      ...(normalized.source_row_ids ?? []),
    ]);
    const sourceRowCount = Math.max(existing.source_row_count, normalized.source_row_count, sourceRowIds.length);

    byRole.set(normalized.source_role, {
      source_role: normalized.source_role,
      source_tables: sourceTables,
      source_row_count: sourceRowCount,
      ...(sourceRowIds.length > 0 ? { source_row_ids: sourceRowIds } : {}),
    });
  }

  return Array.from(byRole.values());
};

const sumRoleRowCounts = (entries: CaseProvenanceSourceRoleBreakdown[]): number =>
  entries.reduce((total, entry) => total + (Number.isFinite(entry.source_row_count) ? entry.source_row_count : 0), 0);

const hasMeaningfulValue = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item));
  }

  if (isRecord(value)) {
    return Object.values(value).some((item) => hasMeaningfulValue(item));
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return value !== null && value !== undefined;
};

export const buildCaseProvenance = (customData: unknown): CaseProvenance | null => {
  if (!isRecord(customData)) {
    return null;
  }

  const nestedProvenance = readField([customData], ['import_provenance', 'importProvenance']);
  const nestedRecord = isRecord(nestedProvenance) ? nestedProvenance : null;
  const provenanceRecords = [nestedRecord, customData];

  const clusterId = readText(provenanceRecords, ['cluster_id', 'clusterId']) ?? '';
  const explicitPrimaryLabel = readText(provenanceRecords, ['primary_label', 'primaryLabel']);
  const explicitRecordType = readText(provenanceRecords, ['record_type', 'recordType']);
  const primaryLabel = explicitPrimaryLabel ?? 'Unknown';
  const recordType = explicitRecordType ?? 'other';
  const sourceTables = normalizeStringArray(
    readField(provenanceRecords, ['source_tables', 'sourceTables'])
  );
  const sourceFiles = normalizeStringArray(
    readField(provenanceRecords, ['source_files', 'sourceFiles'])
  );
  const sourceRoleBreakdown = normalizeRoleBreakdown(
    readField(provenanceRecords, ['source_role_breakdown', 'sourceRoleBreakdown'])
  );
  const participantIds = normalizeStringArray(
    readField(provenanceRecords, ['participant_ids', 'participantIds'])
  );
  const sourceRowIds = normalizeStringArray(
    readField(provenanceRecords, ['source_row_ids', 'sourceRowIds'])
  );
  const sourceTypeBreakdown = normalizeStringArray(
    readField(provenanceRecords, ['source_type_breakdown', 'sourceTypeBreakdown'])
  );
  const sourceRowCount =
    readNumber(provenanceRecords, ['source_row_count', 'sourceRowCount']) ??
    (sourceRowIds.length > 0 ? sourceRowIds.length : sumRoleRowCounts(sourceRoleBreakdown));
  const sourceTableCount =
    readNumber(provenanceRecords, ['source_table_count', 'sourceTableCount']) ?? sourceTables.length;
  const sourceFileCount =
    readNumber(provenanceRecords, ['source_file_count', 'sourceFileCount']) ?? sourceFiles.length;
  const linkConfidence = readNumber(provenanceRecords, ['link_confidence', 'linkConfidence']);
  const confidenceLabel = normalizeConfidenceLabel(
    readText(provenanceRecords, ['confidence_label', 'confidenceLabel']),
    linkConfidence
  );
  const isLowConfidence =
    readBoolean(provenanceRecords, ['is_low_confidence', 'isLowConfidence']) ??
    (linkConfidence !== null ? linkConfidence < CONFIDENCE_LOW_THRESHOLD : false);

  const hasData =
    hasMeaningfulValue(nestedRecord) ||
    clusterId.length > 0 ||
    explicitPrimaryLabel !== null ||
    explicitRecordType !== null ||
    sourceTables.length > 0 ||
    sourceFiles.length > 0 ||
    sourceRoleBreakdown.length > 0 ||
    participantIds.length > 0 ||
    sourceRowIds.length > 0 ||
    sourceRowCount > 0 ||
    sourceTableCount > 0 ||
    sourceFileCount > 0 ||
    sourceTypeBreakdown.length > 0 ||
    linkConfidence !== null;

  if (!hasData) {
    return null;
  }

  return {
    system: 'imported',
    cluster_id: clusterId,
    primary_label: primaryLabel,
    record_type: recordType,
    source_tables: sourceTables,
    source_files: sourceFiles,
    source_role_breakdown: sourceRoleBreakdown,
    participant_ids: participantIds,
    source_row_ids: sourceRowIds,
    source_row_count: sourceRowCount,
    source_table_count: sourceTableCount,
    source_file_count: sourceFileCount,
    source_type_breakdown: sourceTypeBreakdown,
    link_confidence: linkConfidence,
    confidence_label: confidenceLabel,
    is_low_confidence: isLowConfidence,
  };
};

export const buildImportedCaseProvenance = ({
  clusterId,
  primaryLabel,
  recordType,
  sourceTables,
  sourceFiles,
  sourceRowIds,
  participantIds,
  sourceTypeBreakdown,
  linkConfidence,
  sourceRows,
}: ImportedCaseProvenanceInput): CaseProvenance => {
  const sourceRoleBreakdownMap = new Map<
    string,
    {
      source_role: string;
      source_tables: Set<string>;
      source_row_ids: Set<string>;
    }
  >();

  for (const row of sourceRows) {
    const sourceRole = (row.recordType || recordType || 'other').trim() || 'other';
    const existing = sourceRoleBreakdownMap.get(sourceRole);
    if (!existing) {
      sourceRoleBreakdownMap.set(sourceRole, {
        source_role: sourceRole,
        source_tables: new Set(row.sourceTable ? [row.sourceTable] : []),
        source_row_ids: new Set(row.sourceRowId ? [row.sourceRowId] : []),
      });
      continue;
    }

    if (row.sourceTable) {
      existing.source_tables.add(row.sourceTable);
    }
    if (row.sourceRowId) {
      existing.source_row_ids.add(row.sourceRowId);
    }
  }

  const sourceRoleBreakdown = Array.from(sourceRoleBreakdownMap.values())
    .map((entry) => {
      const source_tables = uniqueStrings(Array.from(entry.source_tables));
      const source_row_ids = uniqueStrings(Array.from(entry.source_row_ids));
      return {
        source_role: entry.source_role,
        source_tables,
        source_row_count: Math.max(source_row_ids.length, source_tables.length > 0 ? source_row_ids.length : 0),
        ...(source_row_ids.length > 0 ? { source_row_ids } : {}),
      } satisfies CaseProvenanceSourceRoleBreakdown;
    })
    .sort((left, right) => {
      if (right.source_row_count !== left.source_row_count) {
        return right.source_row_count - left.source_row_count;
      }
      return left.source_role.localeCompare(right.source_role);
    });

  const sourceRowCount = Math.max(sourceRowIds.length, sourceRows.length);
  const sourceTableCount = uniqueStrings(sourceTables).length;
  const sourceFileCount = uniqueStrings(sourceFiles).length;
  const confidenceLabel = normalizeConfidenceLabelFromLinkConfidence(linkConfidence);

  return {
    system: 'imported',
    cluster_id: clusterId,
    primary_label: primaryLabel,
    record_type: recordType,
    source_tables: uniqueStrings(sourceTables),
    source_files: uniqueStrings(sourceFiles),
    source_role_breakdown: sourceRoleBreakdown,
    participant_ids: uniqueStrings(participantIds),
    source_row_ids: uniqueStrings(sourceRowIds),
    source_row_count: sourceRowCount,
    source_table_count: sourceTableCount,
    source_file_count: sourceFileCount,
    source_type_breakdown: uniqueStrings(sourceTypeBreakdown),
    link_confidence: linkConfidence,
    confidence_label: confidenceLabel,
    is_low_confidence: linkConfidence !== null ? linkConfidence < CONFIDENCE_LOW_THRESHOLD : false,
  };
};

export const sanitizePortalCaseProvenance = (
  provenance: CaseProvenance | null
): PortalCaseProvenance | null => {
  if (!provenance) {
    return null;
  }

  return {
    system: provenance.system,
    primary_label: provenance.primary_label,
    record_type: provenance.record_type,
    source_tables: [...provenance.source_tables],
    source_role_breakdown: provenance.source_role_breakdown.map((entry) => ({
      source_role: entry.source_role,
      source_tables: [...entry.source_tables],
      source_row_count: entry.source_row_count,
    })),
    source_row_count: provenance.source_row_count,
    source_table_count: provenance.source_table_count,
    source_file_count: provenance.source_file_count,
    source_type_breakdown: [...provenance.source_type_breakdown],
    link_confidence: provenance.link_confidence,
    confidence_label: provenance.confidence_label,
    is_low_confidence: provenance.is_low_confidence,
  };
};

export const buildPortalCaseProvenance = (customData: unknown): PortalCaseProvenance | null => {
  return sanitizePortalCaseProvenance(buildCaseProvenance(customData));
};

export const hasImportProvenance = (customData: unknown): boolean => {
  return buildCaseProvenance(customData) !== null;
};
