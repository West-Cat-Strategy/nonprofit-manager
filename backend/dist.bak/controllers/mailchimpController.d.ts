/**
 * Mailchimp Controller
 * HTTP handlers for email marketing operations
 */
import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
/**
 * Get Mailchimp configuration status
 */
export declare const getStatus: (_req: Request, res: Response) => Promise<void>;
/**
 * Get all Mailchimp lists/audiences
 */
export declare const getLists: (_req: Request, res: Response) => Promise<void>;
/**
 * Get a specific list by ID
 */
export declare const getList: (req: Request<{
    id: string;
}>, res: Response) => Promise<void>;
/**
 * Add or update a member in a list
 */
export declare const addMember: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get a member from a list
 */
export declare const getMember: (req: Request<{
    listId: string;
    email: string;
}>, res: Response) => Promise<void>;
/**
 * Delete a member from a list
 */
export declare const deleteMember: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Sync a single contact to Mailchimp
 */
export declare const syncContact: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Bulk sync contacts to Mailchimp
 */
export declare const bulkSyncContacts: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update member tags
 */
export declare const updateMemberTags: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get list tags
 */
export declare const getListTags: (req: Request<{
    listId: string;
}>, res: Response) => Promise<void>;
/**
 * Get campaigns
 */
export declare const getCampaigns: (req: Request, res: Response) => Promise<void>;
/**
 * Create a segment
 */
export declare const createSegment: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get segments for a list
 */
export declare const getSegments: (req: Request<{
    listId: string;
}>, res: Response) => Promise<void>;
/**
 * Create a new email campaign
 */
export declare const createCampaign: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Send a campaign immediately
 */
export declare const sendCampaign: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Handle Mailchimp webhook
 */
export declare const handleWebhook: (req: Request, res: Response) => Promise<void>;
declare const _default: {
    getStatus: (_req: Request, res: Response) => Promise<void>;
    getLists: (_req: Request, res: Response) => Promise<void>;
    getList: (req: Request<{
        id: string;
    }>, res: Response) => Promise<void>;
    addMember: (req: AuthRequest, res: Response) => Promise<void>;
    getMember: (req: Request<{
        listId: string;
        email: string;
    }>, res: Response) => Promise<void>;
    deleteMember: (req: AuthRequest, res: Response) => Promise<void>;
    syncContact: (req: AuthRequest, res: Response) => Promise<void>;
    bulkSyncContacts: (req: AuthRequest, res: Response) => Promise<void>;
    updateMemberTags: (req: AuthRequest, res: Response) => Promise<void>;
    getListTags: (req: Request<{
        listId: string;
    }>, res: Response) => Promise<void>;
    getCampaigns: (req: Request, res: Response) => Promise<void>;
    createCampaign: (req: AuthRequest, res: Response) => Promise<void>;
    sendCampaign: (req: AuthRequest, res: Response) => Promise<void>;
    createSegment: (req: AuthRequest, res: Response) => Promise<void>;
    getSegments: (req: Request<{
        listId: string;
    }>, res: Response) => Promise<void>;
    handleWebhook: (req: Request, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=mailchimpController.d.ts.map