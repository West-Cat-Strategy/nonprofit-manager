"use strict";
/**
 * Mailchimp Controller
 * HTTP handlers for email marketing operations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.sendCampaign = exports.createCampaign = exports.getSegments = exports.createSegment = exports.getCampaigns = exports.getListTags = exports.updateMemberTags = exports.bulkSyncContacts = exports.syncContact = exports.deleteMember = exports.getMember = exports.addMember = exports.getList = exports.getLists = exports.getStatus = void 0;
const logger_1 = require("../config/logger");
const mailchimpService = __importStar(require("../services/mailchimpService"));
/**
 * Get Mailchimp configuration status
 */
const getStatus = async (_req, res) => {
    try {
        const status = await mailchimpService.getStatus();
        res.json(status);
    }
    catch (error) {
        logger_1.logger.error('Error getting Mailchimp status', { error });
        res.status(500).json({ error: 'Failed to get Mailchimp status' });
    }
};
exports.getStatus = getStatus;
/**
 * Get all Mailchimp lists/audiences
 */
const getLists = async (_req, res) => {
    try {
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const lists = await mailchimpService.getLists();
        res.json(lists);
    }
    catch (error) {
        logger_1.logger.error('Error getting Mailchimp lists', { error });
        res.status(500).json({ error: 'Failed to get Mailchimp lists' });
    }
};
exports.getLists = getLists;
/**
 * Get a specific list by ID
 */
const getList = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const list = await mailchimpService.getList(id);
        res.json(list);
    }
    catch (error) {
        logger_1.logger.error('Error getting Mailchimp list', { error });
        res.status(500).json({ error: 'Failed to get Mailchimp list' });
    }
};
exports.getList = getList;
/**
 * Add or update a member in a list
 */
const addMember = async (req, res) => {
    try {
        const { listId, email, status, mergeFields, tags } = req.body;
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const member = await mailchimpService.addOrUpdateMember({
            listId,
            email,
            status,
            mergeFields,
            tags,
        });
        res.status(201).json(member);
    }
    catch (error) {
        logger_1.logger.error('Error adding Mailchimp member', { error });
        res.status(500).json({ error: 'Failed to add member to Mailchimp' });
    }
};
exports.addMember = addMember;
/**
 * Get a member from a list
 */
const getMember = async (req, res) => {
    try {
        const { listId, email } = req.params;
        if (!listId || !email) {
            res.status(400).json({ error: 'List ID and email are required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const member = await mailchimpService.getMember(listId, email);
        if (!member) {
            res.status(404).json({ error: 'Member not found' });
            return;
        }
        res.json(member);
    }
    catch (error) {
        logger_1.logger.error('Error getting Mailchimp member', { error });
        res.status(500).json({ error: 'Failed to get Mailchimp member' });
    }
};
exports.getMember = getMember;
/**
 * Delete a member from a list
 */
const deleteMember = async (req, res) => {
    try {
        const { listId, email } = req.params;
        if (!listId || !email) {
            res.status(400).json({ error: 'List ID and email are required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        await mailchimpService.deleteMember(listId, email);
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Error deleting Mailchimp member', { error });
        res.status(500).json({ error: 'Failed to delete Mailchimp member' });
    }
};
exports.deleteMember = deleteMember;
/**
 * Sync a single contact to Mailchimp
 */
const syncContact = async (req, res) => {
    try {
        const { contactId, listId, tags } = req.body;
        if (!contactId) {
            res.status(400).json({ error: 'Contact ID is required' });
            return;
        }
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const result = await mailchimpService.syncContact({ contactId, listId, tags });
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(400).json(result);
        }
    }
    catch (error) {
        logger_1.logger.error('Error syncing contact to Mailchimp', { error });
        res.status(500).json({ error: 'Failed to sync contact to Mailchimp' });
    }
};
exports.syncContact = syncContact;
/**
 * Bulk sync contacts to Mailchimp
 */
const bulkSyncContacts = async (req, res) => {
    try {
        const { contactIds, listId, tags } = req.body;
        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            res.status(400).json({ error: 'Contact IDs array is required and must not be empty' });
            return;
        }
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        // Limit bulk sync to 500 contacts at a time
        if (contactIds.length > 500) {
            res.status(400).json({ error: 'Maximum 500 contacts can be synced at once' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const result = await mailchimpService.bulkSyncContacts({ contactIds, listId, tags });
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error bulk syncing contacts to Mailchimp', { error });
        res.status(500).json({ error: 'Failed to bulk sync contacts to Mailchimp' });
    }
};
exports.bulkSyncContacts = bulkSyncContacts;
/**
 * Update member tags
 */
const updateMemberTags = async (req, res) => {
    try {
        const { listId, email, tagsToAdd, tagsToRemove } = req.body;
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        await mailchimpService.updateMemberTags({ listId, email, tagsToAdd, tagsToRemove });
        res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Error updating member tags', { error });
        res.status(500).json({ error: 'Failed to update member tags' });
    }
};
exports.updateMemberTags = updateMemberTags;
/**
 * Get list tags
 */
const getListTags = async (req, res) => {
    try {
        const { listId } = req.params;
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const tags = await mailchimpService.getListTags(listId);
        res.json(tags);
    }
    catch (error) {
        logger_1.logger.error('Error getting list tags', { error });
        res.status(500).json({ error: 'Failed to get list tags' });
    }
};
exports.getListTags = getListTags;
/**
 * Get campaigns
 */
const getCampaigns = async (req, res) => {
    try {
        const { listId } = req.query;
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const campaigns = await mailchimpService.getCampaigns(listId);
        res.json(campaigns);
    }
    catch (error) {
        logger_1.logger.error('Error getting campaigns', { error });
        res.status(500).json({ error: 'Failed to get campaigns' });
    }
};
exports.getCampaigns = getCampaigns;
/**
 * Create a segment
 */
const createSegment = async (req, res) => {
    try {
        const { listId, name, matchType, conditions } = req.body;
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!name) {
            res.status(400).json({ error: 'Segment name is required' });
            return;
        }
        if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
            res.status(400).json({ error: 'Segment conditions are required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const segment = await mailchimpService.createSegment({
            listId,
            name,
            matchType: matchType || 'all',
            conditions,
        });
        res.status(201).json(segment);
    }
    catch (error) {
        logger_1.logger.error('Error creating segment', { error });
        res.status(500).json({ error: 'Failed to create segment' });
    }
};
exports.createSegment = createSegment;
/**
 * Get segments for a list
 */
const getSegments = async (req, res) => {
    try {
        const { listId } = req.params;
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const segments = await mailchimpService.getSegments(listId);
        res.json(segments);
    }
    catch (error) {
        logger_1.logger.error('Error getting segments', { error });
        res.status(500).json({ error: 'Failed to get segments' });
    }
};
exports.getSegments = getSegments;
/**
 * Create a new email campaign
 */
const createCampaign = async (req, res) => {
    try {
        const { listId, title, subject, previewText, fromName, replyTo, htmlContent, plainTextContent, segmentId, sendTime, } = req.body;
        if (!listId) {
            res.status(400).json({ error: 'List ID is required' });
            return;
        }
        if (!title) {
            res.status(400).json({ error: 'Campaign title is required' });
            return;
        }
        if (!subject) {
            res.status(400).json({ error: 'Subject line is required' });
            return;
        }
        if (!fromName) {
            res.status(400).json({ error: 'From name is required' });
            return;
        }
        if (!replyTo) {
            res.status(400).json({ error: 'Reply-to email is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        const campaign = await mailchimpService.createCampaign({
            listId,
            title,
            subject,
            previewText,
            fromName,
            replyTo,
            htmlContent,
            plainTextContent,
            segmentId,
            sendTime: sendTime ? new Date(sendTime) : undefined,
        });
        res.status(201).json(campaign);
    }
    catch (error) {
        logger_1.logger.error('Error creating campaign', { error });
        res.status(500).json({ error: 'Failed to create campaign' });
    }
};
exports.createCampaign = createCampaign;
/**
 * Send a campaign immediately
 */
const sendCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        if (!campaignId) {
            res.status(400).json({ error: 'Campaign ID is required' });
            return;
        }
        if (!mailchimpService.isMailchimpConfigured()) {
            res.status(503).json({ error: 'Mailchimp is not configured' });
            return;
        }
        await mailchimpService.sendCampaign(campaignId);
        res.json({ success: true, message: 'Campaign sent successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error sending campaign', { error });
        res.status(500).json({ error: 'Failed to send campaign' });
    }
};
exports.sendCampaign = sendCampaign;
/**
 * Handle Mailchimp webhook
 */
const handleWebhook = async (req, res) => {
    try {
        // Mailchimp sends webhook data as form data
        const payload = req.body;
        logger_1.logger.info('Mailchimp webhook received', {
            type: payload.type,
            listId: payload.data?.listId,
            email: payload.data?.email,
        });
        // Handle different webhook event types
        switch (payload.type) {
            case 'subscribe':
                logger_1.logger.info('New subscriber', {
                    email: payload.data.email,
                    listId: payload.data.listId,
                });
                // Could sync back to contacts table if needed
                break;
            case 'unsubscribe':
                logger_1.logger.info('Unsubscribe', {
                    email: payload.data.email,
                    listId: payload.data.listId,
                });
                // Could update contact's do_not_email flag
                break;
            case 'profile':
                logger_1.logger.info('Profile update', {
                    email: payload.data.email,
                    listId: payload.data.listId,
                });
                // Could sync profile changes back to contacts
                break;
            case 'upemail':
                logger_1.logger.info('Email address changed', {
                    oldEmail: payload.data.oldEmail,
                    newEmail: payload.data.newEmail,
                    listId: payload.data.listId,
                });
                // Could update contact email if needed
                break;
            case 'cleaned':
                logger_1.logger.info('Email cleaned (bounced/invalid)', {
                    email: payload.data.email,
                    listId: payload.data.listId,
                    reason: payload.data.reason,
                });
                // Could mark contact email as invalid
                break;
            case 'campaign':
                logger_1.logger.info('Campaign event', {
                    listId: payload.data.listId,
                });
                break;
            default:
                logger_1.logger.debug('Unhandled Mailchimp webhook type', { type: payload.type });
        }
        // Always return 200 to acknowledge receipt
        res.json({ received: true });
    }
    catch (error) {
        logger_1.logger.error('Mailchimp webhook error', { error });
        // Still return 200 to prevent Mailchimp from retrying
        res.json({ received: true, error: 'Processing error' });
    }
};
exports.handleWebhook = handleWebhook;
exports.default = {
    getStatus: exports.getStatus,
    getLists: exports.getLists,
    getList: exports.getList,
    addMember: exports.addMember,
    getMember: exports.getMember,
    deleteMember: exports.deleteMember,
    syncContact: exports.syncContact,
    bulkSyncContacts: exports.bulkSyncContacts,
    updateMemberTags: exports.updateMemberTags,
    getListTags: exports.getListTags,
    getCampaigns: exports.getCampaigns,
    createCampaign: exports.createCampaign,
    sendCampaign: exports.sendCampaign,
    createSegment: exports.createSegment,
    getSegments: exports.getSegments,
    handleWebhook: exports.handleWebhook,
};
//# sourceMappingURL=mailchimpController.js.map