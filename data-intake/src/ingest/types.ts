export type IngestSourceType = 'csv' | 'tsv' | 'excel' | 'json' | 'xml';

export type InferredType =
  | 'unknown'
  | 'string'
  | 'number'
  | 'currency'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'uuid'
  | 'email'
  | 'phone';

export interface TypeInferenceStats {
  nonNullCount: number;
  counts: Partial<Record<InferredType, number>>;
}

export interface IngestColumnProfile {
  name: string;
  normalizedName: string;
  inferredType: InferredType;
  inferredTypeConfidence?: number;
  inferenceStats?: TypeInferenceStats;
  nonEmptyCount: number;
  nullishCount: number;
  uniqueCount: number;
  nonEmptyRatio?: number;
  uniqueRatio?: number;
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
  detectedPatterns?: string[];
  samples: string[];
}

export interface IngestDataset {
  sourceType: IngestSourceType;
  name: string;
  columnNames: string[];
  rowCount: number;
  sampleRows: Record<string, string | null>[];
  columns: IngestColumnProfile[];
  warnings: string[];
  meta?: Record<string, unknown>;
}

export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'uuid'
  | 'enum';

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  required?: boolean;
  aliases?: string[];
  enum_values?: string[];
  constraints?: Record<string, unknown>;
}

export interface SchemaTable {
  name: string;
  aliases?: string[];
  fields: SchemaField[];
}

export interface SchemaBundle {
  version: string;
  generated_at: string;
  tables: SchemaTable[];
}

export interface FieldMatchCandidate {
  table: string;
  field: string;
  score: number;
  reasons: string[];
}

export interface ColumnMatchSuggestion {
  sourceColumn: string;
  candidates: FieldMatchCandidate[];
}

export interface TableMatchSuggestion {
  table: string;
  score: number;
  coverage: number;
  suggestedMapping: Record<string, string>;
  columnSuggestions: ColumnMatchSuggestion[];
  reasons: string[];
}

export interface NormalizationAction {
  action:
    | 'trim_whitespace'
    | 'case_normalize'
    | 'date_parse'
    | 'currency_parse'
    | 'boolean_coerce'
    | 'phone_normalize'
    | 'enum_map'
    | 'null_coerce';
  config?: Record<string, unknown>;
  reason: string;
}

export interface FieldNormalizationSuggestion {
  sourceColumn: string;
  targetField: string;
  actions: NormalizationAction[];
}

export interface NormalizedPreviewRow {
  sourceRowIndex: number;
  normalized: Record<string, string | null>;
  notes: string[];
}

export interface DatasetSuggestionResult {
  dataset_name: string;
  table_suggestions: TableMatchSuggestion[];
  proposed_mapping: Record<string, string>;
  normalization_actions: FieldNormalizationSuggestion[];
  quality_warnings: string[];
  preview_normalized_rows: NormalizedPreviewRow[];
}

export interface IngestPreviewResponse {
  schema_version: string;
  datasets: IngestDataset[];
  suggestions: DatasetSuggestionResult[];
}

export interface MatchOptions {
  perColumnCandidates?: number;
  minCandidateScore?: number;
  minAcceptedMappingScore?: number;
}
