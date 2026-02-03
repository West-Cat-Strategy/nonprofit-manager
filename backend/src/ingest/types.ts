export type IngestSourceType = 'csv' | 'excel' | 'sql';

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
  inferredTypeConfidence?: number; // 0..1
  inferenceStats?: TypeInferenceStats;

  nonEmptyCount: number;
  nullishCount: number;
  uniqueCount: number;

  nonEmptyRatio?: number; // 0..1
  uniqueRatio?: number; // 0..1

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

export interface IngestPreviewResult {
  datasets: IngestDataset[];
  schemaSuggestions: SchemaMatchSuggestion[];
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
  field: string;
  type: SchemaFieldType;
  required?: boolean;
  aliases?: string[];
}

export interface SchemaTable {
  table: string;
  label: string;
  fields: SchemaField[];
  aliases?: string[];
}

export interface FieldMatchCandidate {
  table: string;
  field: string;
  score: number; // 0..1
  reasons: string[];
}

export interface ColumnMatchSuggestion {
  sourceColumn: string;
  candidates: FieldMatchCandidate[];
}

export interface TableMatchSuggestion {
  table: string;
  score: number; // 0..1
  coverage: number; // 0..1
  suggestedMapping: Record<string, string>; // sourceColumn -> table.field
  columnSuggestions: ColumnMatchSuggestion[];
  reasons?: string[];
}

export interface SchemaMatchSuggestion {
  datasetName: string;
  bestTable?: TableMatchSuggestion;
  tables: TableMatchSuggestion[];
}

