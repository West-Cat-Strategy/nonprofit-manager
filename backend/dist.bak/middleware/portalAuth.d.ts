import { Request, Response, NextFunction } from 'express';
interface PortalJwtPayload {
    id: string;
    email: string;
    contactId: string | null;
    type: 'portal';
}
export interface PortalAuthRequest extends Request<Record<string, string>, any, any, Record<string, string | undefined>> {
    portalUser?: PortalJwtPayload;
}
export declare const authenticatePortal: (req: PortalAuthRequest, res: Response, next: NextFunction) => Response | void;
export {};
//# sourceMappingURL=portalAuth.d.ts.map