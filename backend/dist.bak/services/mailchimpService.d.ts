/**
 * Mailchimp Service
 * Handles email marketing integration with Mailchimp
 */
import type { MailchimpStatus, MailchimpList, MailchimpMember, AddMemberRequest, SyncContactRequest, BulkSyncRequest, BulkSyncResponse, SyncResult, MailchimpTag, UpdateTagsRequest, MailchimpCampaign, CreateSegmentRequest, MailchimpSegment, CreateCampaignRequest } from '../types/mailchimp';
/**
 * Check if Mailchimp is configured
 */
export declare function isMailchimpConfigured(): boolean;
/**
 * Get Mailchimp account status and basic info
 */
export declare function getStatus(): Promise<MailchimpStatus>;
/**
 * Get all Mailchimp audiences/lists
 */
export declare function getLists(): Promise<MailchimpList[]>;
/**
 * Get a specific list by ID
 */
export declare function getList(listId: string): Promise<MailchimpList>;
/**
 * Add or update a member in a Mailchimp list
 */
export declare function addOrUpdateMember(request: AddMemberRequest): Promise<MailchimpMember>;
/**
 * Get a member from a Mailchimp list
 */
export declare function getMember(listId: string, email: string): Promise<MailchimpMember | null>;
/**
 * Delete a member from a Mailchimp list
 */
export declare function deleteMember(listId: string, email: string): Promise<void>;
/**
 * Sync a single contact to Mailchimp
 */
export declare function syncContact(request: SyncContactRequest): Promise<SyncResult>;
/**
 * Bulk sync contacts to Mailchimp
 */
export declare function bulkSyncContacts(request: BulkSyncRequest): Promise<BulkSyncResponse>;
/**
 * Update tags for a member
 */
export declare function updateMemberTags(request: UpdateTagsRequest): Promise<void>;
/**
 * Get all tags for a list
 */
export declare function getListTags(listId: string): Promise<MailchimpTag[]>;
/**
 * Get campaigns
 */
export declare function getCampaigns(listId?: string): Promise<MailchimpCampaign[]>;
/**
 * Create a segment in a list
 */
export declare function createSegment(request: CreateSegmentRequest): Promise<MailchimpSegment>;
/**
 * Get segments for a list
 */
export declare function getSegments(listId: string): Promise<MailchimpSegment[]>;
/**
 * Create a new email campaign
 */
export declare function createCampaign(request: CreateCampaignRequest): Promise<MailchimpCampaign>;
/**
 * Send a campaign immediately
 */
export declare function sendCampaign(campaignId: string): Promise<void>;
declare const _default: {
    isMailchimpConfigured: typeof isMailchimpConfigured;
    getStatus: typeof getStatus;
    getLists: typeof getLists;
    getList: typeof getList;
    addOrUpdateMember: typeof addOrUpdateMember;
    getMember: typeof getMember;
    deleteMember: typeof deleteMember;
    syncContact: typeof syncContact;
    bulkSyncContacts: typeof bulkSyncContacts;
    updateMemberTags: typeof updateMemberTags;
    getListTags: typeof getListTags;
    getCampaigns: typeof getCampaigns;
    createCampaign: typeof createCampaign;
    sendCampaign: typeof sendCampaign;
    createSegment: typeof createSegment;
    getSegments: typeof getSegments;
};
export default _default;
//# sourceMappingURL=mailchimpService.d.ts.map