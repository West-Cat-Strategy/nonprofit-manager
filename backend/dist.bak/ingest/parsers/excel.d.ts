import type { IngestDataset } from '../types';
export interface ExcelParseOptions {
    name?: string;
    sheetName?: string;
    maxRows?: number;
    hasHeader?: boolean | 'auto';
}
export declare function parseExcelToDatasets(buffer: Buffer, options?: ExcelParseOptions): IngestDataset[];
//# sourceMappingURL=excel.d.ts.map