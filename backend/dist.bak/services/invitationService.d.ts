/**
 * Invitation Service
 * Handles user invitation management
 */
export interface UserInvitation {
    id: string;
    email: string;
    role: string;
    token: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    acceptedBy: string | null;
    isRevoked: boolean;
    revokedAt: Date | null;
    revokedBy: string | null;
    message: string | null;
    createdAt: Date;
    createdBy: string;
    createdByName?: string;
}
export interface CreateInvitationDTO {
    email: string;
    role: string;
    message?: string;
    expiresInDays?: number;
}
/**
 * Create a new user invitation
 */
export declare const createInvitation: (data: CreateInvitationDTO, createdBy: string) => Promise<UserInvitation>;
/**
 * Get all invitations (for admin listing)
 */
export declare const getInvitations: (options: {
    includeExpired?: boolean;
    includeAccepted?: boolean;
    includeRevoked?: boolean;
}) => Promise<UserInvitation[]>;
/**
 * Get invitation by ID
 */
export declare const getInvitationById: (id: string) => Promise<UserInvitation | null>;
/**
 * Get invitation by token (for acceptance flow)
 */
export declare const getInvitationByToken: (token: string) => Promise<UserInvitation | null>;
/**
 * Validate if an invitation can be accepted
 */
export declare const validateInvitation: (token: string) => Promise<{
    valid: boolean;
    invitation: UserInvitation | null;
    error?: string;
}>;
/**
 * Mark invitation as accepted
 */
export declare const markInvitationAccepted: (invitationId: string, userId: string) => Promise<void>;
/**
 * Revoke an invitation
 */
export declare const revokeInvitation: (invitationId: string, revokedBy: string) => Promise<UserInvitation | null>;
/**
 * Resend an invitation (generates new token and expiry)
 */
export declare const resendInvitation: (invitationId: string, updatedBy: string) => Promise<UserInvitation | null>;
//# sourceMappingURL=invitationService.d.ts.map