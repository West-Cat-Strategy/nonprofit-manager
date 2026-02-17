import { Request, Response, NextFunction } from 'express';
import { PortalAuthRequest } from '../middleware/portalAuth';
export declare const portalSignup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const portalLogin: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getPortalMe: (req: PortalAuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const validatePortalInvitation: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const acceptPortalInvitation: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=portalAuthController.d.ts.map