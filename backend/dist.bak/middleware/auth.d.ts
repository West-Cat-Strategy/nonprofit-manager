import { Request, Response, NextFunction } from 'express';
interface JwtPayload {
    id: string;
    email: string;
    role: string;
}
export interface AuthRequest extends Request<Record<string, string>, any, any, Record<string, string | undefined>> {
    user?: JwtPayload;
    organizationId?: string;
    accountId?: string;
    tenantId?: string;
    dataScope?: {
        resource: string;
        scopeId?: string;
        filter?: Record<string, unknown>;
    };
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
export declare const authorize: (...allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response | void;
export {};
//# sourceMappingURL=auth.d.ts.map