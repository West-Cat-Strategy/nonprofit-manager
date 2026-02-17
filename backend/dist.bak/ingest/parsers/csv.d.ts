import type { IngestDataset } from '../types';
export interface CsvParseOptions {
    name?: string;
    maxRows?: number;
    hasHeader?: boolean | 'auto';
    delimiter?: string | 'auto';
}
export declare function parseCsvToDataset(input: string, options?: CsvParseOptions): IngestDataset;
//# sourceMappingURL=csv.d.ts.map