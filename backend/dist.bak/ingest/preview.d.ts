import type { IngestPreviewResult, IngestSourceType } from './types';
export declare function ingestPreviewFromText(params: {
    text: string;
    format: IngestSourceType;
    name?: string;
}): IngestPreviewResult;
export declare function ingestPreviewFromTextAuto(params: {
    text: string;
    name?: string;
}): IngestPreviewResult;
export declare function ingestPreviewFromBuffer(params: {
    buffer: Buffer;
    filename?: string;
    mimeType?: string;
    format?: IngestSourceType;
    sheetName?: string;
    name?: string;
}): IngestPreviewResult;
//# sourceMappingURL=preview.d.ts.map