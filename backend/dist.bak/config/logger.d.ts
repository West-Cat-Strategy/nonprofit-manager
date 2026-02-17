import winston from 'winston';
declare const SENSITIVE_FIELDS: string[];
declare const maskSensitiveData: (obj: unknown) => unknown;
export declare const logger: winston.Logger;
export { maskSensitiveData, SENSITIVE_FIELDS };
//# sourceMappingURL=logger.d.ts.map