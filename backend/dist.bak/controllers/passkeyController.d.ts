import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const listPasskeys: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const deletePasskey: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const registrationOptions: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const registrationVerify: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const loginOptions: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const loginVerify: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=passkeyController.d.ts.map