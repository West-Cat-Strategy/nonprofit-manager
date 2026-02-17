import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const loadDataScope: (resource: string) => (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export default loadDataScope;
//# sourceMappingURL=dataScope.d.ts.map