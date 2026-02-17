import type { IngestDataset, SchemaMatchSuggestion, SchemaTable } from './types';
export interface MatchOptions {
    perColumnCandidates?: number;
    minCandidateScore?: number;
    minAcceptedMappingScore?: number;
}
export declare function suggestSchemaMatches(dataset: IngestDataset, tables: SchemaTable[], options?: MatchOptions): SchemaMatchSuggestion;
//# sourceMappingURL=matcher.d.ts.map