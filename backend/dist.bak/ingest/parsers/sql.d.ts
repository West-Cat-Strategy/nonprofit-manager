import type { IngestDataset } from '../types';
export interface SqlParseOptions {
    name?: string;
    maxSampleRows?: number;
}
export declare function parseSqlToDatasets(sql: string, options?: SqlParseOptions): IngestDataset[];
//# sourceMappingURL=sql.d.ts.map