/**
 * Invitation Controller
 * Handles user invitation endpoints
 */
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * POST /api/invitations
 * Create a new invitation (admin only)
 */
export declare const createInvitation: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/invitations
 * List all invitations (admin only)
 */
export declare const getInvitations: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/invitations/:id
 * Get invitation by ID (admin only)
 */
export declare const getInvitationById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * GET /api/invitations/validate/:token
 * Validate invitation token (public - for acceptance flow)
 */
export declare const validateInvitation: (req: Request<{
    token: string;
}>, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * POST /api/invitations/accept/:token
 * Accept invitation and create user account (public)
 */
export declare const acceptInvitation: (req: Request<{
    token: string;
}>, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * DELETE /api/invitations/:id
 * Revoke an invitation (admin only)
 */
export declare const revokeInvitation: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * POST /api/invitations/:id/resend
 * Resend an invitation with new token (admin only)
 */
export declare const resendInvitation: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=invitationController.d.ts.map