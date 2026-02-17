import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getSecurityOverview: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const enrollTotp: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const enableTotp: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const disableTotp: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const completeTotpLogin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const issueTotpMfaChallenge: (user: {
    id: string;
    email: string;
    role: string;
}) => {
    mfaRequired: true;
    method: "totp";
    mfaToken: string;
};
//# sourceMappingURL=mfaController.d.ts.map