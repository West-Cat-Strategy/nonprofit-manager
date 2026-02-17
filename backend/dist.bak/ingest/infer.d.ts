import type { InferredType, TypeInferenceStats } from './types';
export declare function inferColumn(values: Array<string | null>): {
    inferredType: InferredType;
    confidence: number;
    stats: TypeInferenceStats;
    patterns: string[];
};
export declare function inferColumnType(values: Array<string | null>): InferredType;
export declare function typeCompatibilityScore(inferred: InferredType, schemaType: string): number;
//# sourceMappingURL=infer.d.ts.map