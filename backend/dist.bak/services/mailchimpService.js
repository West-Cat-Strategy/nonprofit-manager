"use strict";
/**
 * Mailchimp Service
 * Handles email marketing integration with Mailchimp
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMailchimpConfigured = isMailchimpConfigured;
exports.getStatus = getStatus;
exports.getLists = getLists;
exports.getList = getList;
exports.addOrUpdateMember = addOrUpdateMember;
exports.getMember = getMember;
exports.deleteMember = deleteMember;
exports.syncContact = syncContact;
exports.bulkSyncContacts = bulkSyncContacts;
exports.updateMemberTags = updateMemberTags;
exports.getListTags = getListTags;
exports.getCampaigns = getCampaigns;
exports.createSegment = createSegment;
exports.getSegments = getSegments;
exports.createCampaign = createCampaign;
exports.sendCampaign = sendCampaign;
const mailchimp_marketing_1 = __importDefault(require("@mailchimp/mailchimp_marketing"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../config/logger");
const database_1 = __importDefault(require("../config/database"));
// Type the mailchimp client with extended methods
const mailchimpClient = mailchimp_marketing_1.default;
// Mailchimp configuration
const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
const mailchimpServerPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
let isConfigured = false;
/**
 * Initialize Mailchimp client
 */
function initializeMailchimp() {
    if (!mailchimpApiKey || !mailchimpServerPrefix) {
        // In tests we intentionally run without external integrations configured.
        if (process.env.NODE_ENV !== 'test') {
            logger_1.logger.warn('Mailchimp is not configured. Set MAILCHIMP_API_KEY and MAILCHIMP_SERVER_PREFIX.');
        }
        return;
    }
    mailchimp_marketing_1.default.setConfig({
        apiKey: mailchimpApiKey,
        server: mailchimpServerPrefix,
    });
    isConfigured = true;
    logger_1.logger.info('Mailchimp client initialized');
}
// Initialize on module load
initializeMailchimp();
/**
 * Check if Mailchimp is configured
 */
function isMailchimpConfigured() {
    return isConfigured;
}
/**
 * Get MD5 hash of email for Mailchimp subscriber lookup
 */
function getSubscriberHash(email) {
    return crypto_1.default.createHash('md5').update(email.toLowerCase()).digest('hex');
}
/**
 * Get Mailchimp account status and basic info
 */
async function getStatus() {
    if (!isConfigured) {
        return { configured: false };
    }
    try {
        const response = await mailchimpClient.ping.get();
        if (response.health_status === "Everything's Chimpy!") {
            // Get account info
            const accountInfo = await mailchimpClient.root.getRoot();
            const lists = await mailchimpClient.lists.getAllLists({ count: 0 });
            return {
                configured: true,
                accountName: accountInfo.account_name,
                listCount: lists.total_items,
            };
        }
        return { configured: false };
    }
    catch (error) {
        logger_1.logger.error('Failed to get Mailchimp status', { error });
        return { configured: false };
    }
}
/**
 * Get all Mailchimp audiences/lists
 */
async function getLists() {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        const response = await mailchimpClient.lists.getAllLists({
            count: 100,
            fields: ['lists.id', 'lists.name', 'lists.stats.member_count', 'lists.date_created', 'lists.double_optin'],
        });
        return response.lists.map((list) => ({
            id: list.id,
            name: list.name,
            memberCount: list.stats.member_count,
            createdAt: new Date(list.date_created),
            doubleOptIn: list.double_optin,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to get Mailchimp lists', { error });
        throw error;
    }
}
/**
 * Get a specific list by ID
 */
async function getList(listId) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        const list = await mailchimpClient.lists.getList(listId);
        return {
            id: list.id,
            name: list.name,
            memberCount: list.stats.member_count,
            createdAt: new Date(list.date_created),
            doubleOptIn: list.double_optin,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get Mailchimp list', { error, listId });
        throw error;
    }
}
/**
 * Add or update a member in a Mailchimp list
 */
async function addOrUpdateMember(request) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    const subscriberHash = getSubscriberHash(request.email);
    try {
        // Use setListMember for upsert behavior
        const response = await mailchimpClient.lists.setListMember(request.listId, subscriberHash, {
            email_address: request.email,
            status_if_new: request.status || 'subscribed',
            merge_fields: request.mergeFields || {},
        });
        // Add tags if provided
        if (request.tags && request.tags.length > 0) {
            await mailchimpClient.lists.updateListMemberTags(request.listId, subscriberHash, {
                tags: request.tags.map((tag) => ({ name: tag, status: 'active' })),
            });
        }
        logger_1.logger.info('Member added/updated in Mailchimp', {
            listId: request.listId,
            email: request.email,
        });
        return {
            id: response.id,
            emailAddress: response.email_address,
            status: response.status,
            mergeFields: response.merge_fields,
            tags: response.tags?.map((t) => t.name) || [],
            listId: response.list_id,
            createdAt: new Date(response.timestamp_signup || response.timestamp_opt),
            lastChanged: new Date(response.last_changed),
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to add/update Mailchimp member', { error, request });
        throw error;
    }
}
/**
 * Get a member from a Mailchimp list
 */
async function getMember(listId, email) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    const subscriberHash = getSubscriberHash(email);
    try {
        const response = await mailchimpClient.lists.getListMember(listId, subscriberHash);
        return {
            id: response.id,
            emailAddress: response.email_address,
            status: response.status,
            mergeFields: response.merge_fields,
            tags: response.tags?.map((t) => t.name) || [],
            listId: response.list_id,
            createdAt: new Date(response.timestamp_signup || response.timestamp_opt),
            lastChanged: new Date(response.last_changed),
        };
    }
    catch (error) {
        // Member not found returns 404
        if (error.status === 404) {
            return null;
        }
        logger_1.logger.error('Failed to get Mailchimp member', { error, listId, email });
        throw error;
    }
}
/**
 * Delete a member from a Mailchimp list
 */
async function deleteMember(listId, email) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    const subscriberHash = getSubscriberHash(email);
    try {
        await mailchimpClient.lists.deleteListMemberPermanent(listId, subscriberHash);
        logger_1.logger.info('Member deleted from Mailchimp', { listId, email });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete Mailchimp member', { error, listId, email });
        throw error;
    }
}
/**
 * Sync a single contact to Mailchimp
 */
async function syncContact(request) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        // Get contact from database
        const result = await database_1.default.query(`SELECT contact_id, first_name, last_name, email, phone,
              address_line1, address_line2, city, state_province, postal_code, country,
              do_not_email
       FROM contacts WHERE contact_id = $1`, [request.contactId]);
        if (result.rows.length === 0) {
            return {
                contactId: request.contactId,
                email: '',
                success: false,
                action: 'skipped',
                error: 'Contact not found',
            };
        }
        const contact = result.rows[0];
        // Skip if no email or do_not_email is set
        if (!contact.email) {
            return {
                contactId: request.contactId,
                email: '',
                success: false,
                action: 'skipped',
                error: 'Contact has no email address',
            };
        }
        if (contact.do_not_email) {
            return {
                contactId: request.contactId,
                email: contact.email,
                success: false,
                action: 'skipped',
                error: 'Contact has do_not_email flag set',
            };
        }
        // Check if member already exists
        const existingMember = await getMember(request.listId, contact.email);
        const action = existingMember ? 'updated' : 'added';
        // Sync to Mailchimp
        await addOrUpdateMember({
            listId: request.listId,
            email: contact.email,
            status: 'subscribed',
            mergeFields: {
                FNAME: contact.first_name || '',
                LNAME: contact.last_name || '',
                PHONE: contact.phone || '',
                ADDRESS: {
                    addr1: contact.address_line1 || '',
                    addr2: contact.address_line2 || '',
                    city: contact.city || '',
                    state: contact.state_province || '',
                    zip: contact.postal_code || '',
                    country: contact.country || 'US',
                },
            },
            tags: request.tags,
        });
        logger_1.logger.info('Contact synced to Mailchimp', {
            contactId: request.contactId,
            email: contact.email,
            listId: request.listId,
            action,
        });
        return {
            contactId: request.contactId,
            email: contact.email,
            success: true,
            action,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to sync contact to Mailchimp', { error, request });
        return {
            contactId: request.contactId,
            email: '',
            success: false,
            action: 'skipped',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Bulk sync contacts to Mailchimp
 */
async function bulkSyncContacts(request) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    const results = [];
    let added = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    for (const contactId of request.contactIds) {
        const result = await syncContact({
            contactId,
            listId: request.listId,
            tags: request.tags,
        });
        results.push(result);
        if (result.success) {
            if (result.action === 'added')
                added++;
            else if (result.action === 'updated')
                updated++;
        }
        else if (result.error) {
            if (result.action === 'skipped')
                skipped++;
            else
                errors++;
        }
    }
    logger_1.logger.info('Bulk sync completed', {
        total: request.contactIds.length,
        added,
        updated,
        skipped,
        errors,
    });
    return {
        total: request.contactIds.length,
        added,
        updated,
        skipped,
        errors,
        results,
    };
}
/**
 * Update tags for a member
 */
async function updateMemberTags(request) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    const subscriberHash = getSubscriberHash(request.email);
    try {
        const tags = [];
        if (request.tagsToAdd) {
            tags.push(...request.tagsToAdd.map((name) => ({ name, status: 'active' })));
        }
        if (request.tagsToRemove) {
            tags.push(...request.tagsToRemove.map((name) => ({ name, status: 'inactive' })));
        }
        if (tags.length > 0) {
            await mailchimpClient.lists.updateListMemberTags(request.listId, subscriberHash, { tags });
        }
        logger_1.logger.info('Member tags updated', { listId: request.listId, email: request.email });
    }
    catch (error) {
        logger_1.logger.error('Failed to update member tags', { error, request });
        throw error;
    }
}
/**
 * Get all tags for a list
 */
async function getListTags(listId) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        const response = await mailchimpClient.lists.listSegments(listId, {
            type: 'static',
            count: 100,
        });
        return response.segments.map((segment) => ({
            id: segment.id,
            name: segment.name,
            memberCount: segment.member_count,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to get list tags', { error, listId });
        throw error;
    }
}
/**
 * Get campaigns
 */
async function getCampaigns(listId) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        const options = { count: 50 };
        if (listId) {
            options.list_id = listId;
        }
        const response = await mailchimpClient.campaigns.list(options);
        return response.campaigns.map((campaign) => ({
            id: campaign.id,
            type: campaign.type,
            status: campaign.status,
            title: campaign.settings.title,
            subject: campaign.settings.subject_line,
            listId: campaign.recipients.list_id,
            createdAt: new Date(campaign.create_time),
            sendTime: campaign.send_time ? new Date(campaign.send_time) : undefined,
            emailsSent: campaign.emails_sent,
            reportSummary: campaign.report_summary ? {
                opens: campaign.report_summary.opens,
                uniqueOpens: campaign.report_summary.unique_opens,
                openRate: campaign.report_summary.open_rate,
                clicks: campaign.report_summary.clicks,
                uniqueClicks: campaign.report_summary.subscriber_clicks,
                clickRate: campaign.report_summary.click_rate,
                unsubscribes: 0, // Not available in all responses
            } : undefined,
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to get campaigns', { error, listId });
        throw error;
    }
}
/**
 * Create a segment in a list
 */
async function createSegment(request) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        const response = await mailchimpClient.lists.createSegment(request.listId, {
            name: request.name,
            options: {
                match: request.matchType,
                conditions: request.conditions.map((c) => ({
                    condition_type: 'TextMerge',
                    field: c.field,
                    op: c.op,
                    value: String(c.value),
                })),
            },
        });
        logger_1.logger.info('Segment created', { listId: request.listId, segmentId: response.id });
        return {
            id: response.id,
            name: response.name,
            memberCount: response.member_count,
            listId: response.list_id,
            createdAt: new Date(response.created_at),
            updatedAt: new Date(response.updated_at),
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to create segment', { error, request });
        throw error;
    }
}
/**
 * Get segments for a list
 */
async function getSegments(listId) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        const response = await mailchimpClient.lists.listSegments(listId, {
            count: 100,
        });
        return response.segments.map((segment) => ({
            id: segment.id,
            name: segment.name,
            memberCount: segment.member_count,
            listId: segment.list_id,
            createdAt: new Date(segment.created_at),
            updatedAt: new Date(segment.updated_at),
        }));
    }
    catch (error) {
        logger_1.logger.error('Failed to get segments', { error, listId });
        throw error;
    }
}
/**
 * Create a new email campaign
 */
async function createCampaign(request) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        // Create campaign
        const campaignData = {
            type: 'regular',
            recipients: {
                list_id: request.listId,
            },
            settings: {
                subject_line: request.subject,
                preview_text: request.previewText,
                title: request.title,
                from_name: request.fromName,
                reply_to: request.replyTo,
            },
        };
        // Add segment if specified
        if (request.segmentId) {
            campaignData.recipients.segment_opts = {
                saved_segment_id: request.segmentId,
            };
        }
        const campaign = await mailchimpClient.campaigns.create(campaignData);
        // Set campaign content if provided
        if (request.htmlContent || request.plainTextContent) {
            const contentData = {};
            if (request.htmlContent) {
                contentData.html = request.htmlContent;
            }
            if (request.plainTextContent) {
                contentData.plain_text = request.plainTextContent;
            }
            await mailchimpClient.campaigns.setContent(campaign.id, contentData);
        }
        // Schedule campaign if send time is provided
        if (request.sendTime) {
            await mailchimpClient.campaigns.schedule(campaign.id, {
                schedule_time: request.sendTime.toISOString(),
            });
        }
        logger_1.logger.info('Campaign created', { campaignId: campaign.id, title: request.title });
        return {
            id: campaign.id,
            type: 'regular',
            status: request.sendTime ? 'schedule' : 'save',
            title: request.title,
            subject: request.subject,
            listId: request.listId,
            createdAt: new Date(campaign.create_time),
            sendTime: request.sendTime,
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to create campaign', { error, request });
        throw error;
    }
}
/**
 * Send a campaign immediately
 */
async function sendCampaign(campaignId) {
    if (!isConfigured) {
        throw new Error('Mailchimp is not configured');
    }
    try {
        await mailchimpClient.campaigns.send(campaignId);
        logger_1.logger.info('Campaign sent', { campaignId });
    }
    catch (error) {
        logger_1.logger.error('Failed to send campaign', { error, campaignId });
        throw error;
    }
}
exports.default = {
    isMailchimpConfigured,
    getStatus,
    getLists,
    getList,
    addOrUpdateMember,
    getMember,
    deleteMember,
    syncContact,
    bulkSyncContacts,
    updateMemberTags,
    getListTags,
    getCampaigns,
    createCampaign,
    sendCampaign,
    createSegment,
    getSegments,
};
//# sourceMappingURL=mailchimpService.js.map