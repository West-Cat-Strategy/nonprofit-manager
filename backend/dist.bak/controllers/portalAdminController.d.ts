import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const listPortalSignupRequests: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const approvePortalSignupRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rejectPortalSignupRequest: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createPortalInvitation: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const listPortalInvitations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const listPortalUsers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updatePortalUserStatus: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getPortalUserActivity: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const resetPortalUserPassword: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=portalAdminController.d.ts.map