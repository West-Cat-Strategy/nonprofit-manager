import { Request, Response, NextFunction } from 'express';
interface ErrorWithStatus extends Error {
    statusCode?: number;
}
export declare const errorHandler: (err: ErrorWithStatus, req: Request, res: Response, _next: NextFunction) => void;
export {};
//# sourceMappingURL=errorHandler.d.ts.map