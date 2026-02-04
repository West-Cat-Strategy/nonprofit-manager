import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const orgContextMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response>;
export default orgContextMiddleware;
//# sourceMappingURL=orgContext.d.ts.map