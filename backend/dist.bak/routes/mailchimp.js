"use strict";
/**
 * Mailchimp Routes
 * API endpoints for email marketing integration
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
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const mailchimpController = __importStar(require("../controllers/mailchimpController"));
const router = (0, express_1.Router)();
/**
 * GET /api/mailchimp/status
 * Get Mailchimp configuration status
 */
router.get('/status', auth_1.authenticate, mailchimpController.getStatus);
/**
 * GET /api/mailchimp/lists
 * Get all Mailchimp audiences/lists
 */
router.get('/lists', auth_1.authenticate, mailchimpController.getLists);
/**
 * GET /api/mailchimp/lists/:id
 * Get a specific list
 */
router.get('/lists/:id', auth_1.authenticate, [(0, express_validator_1.param)('id').isString().notEmpty().withMessage('List ID is required')], mailchimpController.getList);
/**
 * GET /api/mailchimp/lists/:listId/tags
 * Get tags for a list
 */
router.get('/lists/:listId/tags', auth_1.authenticate, [(0, express_validator_1.param)('listId').isString().notEmpty().withMessage('List ID is required')], mailchimpController.getListTags);
/**
 * GET /api/mailchimp/lists/:listId/segments
 * Get segments for a list
 */
router.get('/lists/:listId/segments', auth_1.authenticate, [(0, express_validator_1.param)('listId').isString().notEmpty().withMessage('List ID is required')], mailchimpController.getSegments);
/**
 * POST /api/mailchimp/lists/:listId/segments
 * Create a segment in a list
 */
router.post('/lists/:listId/segments', auth_1.authenticate, [
    (0, express_validator_1.param)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.body)('name').isString().notEmpty().withMessage('Segment name is required'),
    (0, express_validator_1.body)('matchType').optional().isIn(['any', 'all']).withMessage('Match type must be "any" or "all"'),
    (0, express_validator_1.body)('conditions').isArray({ min: 1 }).withMessage('At least one condition is required'),
    (0, express_validator_1.body)('conditions.*.field').isString().notEmpty().withMessage('Condition field is required'),
    (0, express_validator_1.body)('conditions.*.op')
        .isIn(['is', 'not', 'contains', 'notcontain', 'greater', 'less', 'blank', 'blank_not'])
        .withMessage('Invalid condition operator'),
    (0, express_validator_1.body)('conditions.*.value').notEmpty().withMessage('Condition value is required'),
], mailchimpController.createSegment);
/**
 * GET /api/mailchimp/lists/:listId/members/:email
 * Get a member from a list
 */
router.get('/lists/:listId/members/:email', auth_1.authenticate, [
    (0, express_validator_1.param)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.param)('email').isEmail().withMessage('Valid email is required'),
], mailchimpController.getMember);
/**
 * DELETE /api/mailchimp/lists/:listId/members/:email
 * Delete a member from a list
 */
router.delete('/lists/:listId/members/:email', auth_1.authenticate, [
    (0, express_validator_1.param)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.param)('email').isEmail().withMessage('Valid email is required'),
], mailchimpController.deleteMember);
/**
 * POST /api/mailchimp/members
 * Add or update a member in a list
 */
router.post('/members', auth_1.authenticate, [
    (0, express_validator_1.body)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'])
        .withMessage('Invalid member status'),
    (0, express_validator_1.body)('mergeFields').optional().isObject().withMessage('Merge fields must be an object'),
    (0, express_validator_1.body)('tags').optional().isArray().withMessage('Tags must be an array'),
], mailchimpController.addMember);
/**
 * POST /api/mailchimp/members/tags
 * Update member tags
 */
router.post('/members/tags', auth_1.authenticate, [
    (0, express_validator_1.body)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('tagsToAdd').optional().isArray().withMessage('Tags to add must be an array'),
    (0, express_validator_1.body)('tagsToRemove').optional().isArray().withMessage('Tags to remove must be an array'),
], mailchimpController.updateMemberTags);
/**
 * POST /api/mailchimp/sync/contact
 * Sync a single contact to Mailchimp
 */
router.post('/sync/contact', auth_1.authenticate, [
    (0, express_validator_1.body)('contactId').isUUID().withMessage('Valid contact ID is required'),
    (0, express_validator_1.body)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.body)('tags').optional().isArray().withMessage('Tags must be an array'),
], mailchimpController.syncContact);
/**
 * POST /api/mailchimp/sync/bulk
 * Bulk sync contacts to Mailchimp
 */
router.post('/sync/bulk', auth_1.authenticate, [
    (0, express_validator_1.body)('contactIds')
        .isArray({ min: 1, max: 500 })
        .withMessage('Contact IDs array is required (max 500)'),
    (0, express_validator_1.body)('contactIds.*').isUUID().withMessage('All contact IDs must be valid UUIDs'),
    (0, express_validator_1.body)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.body)('tags').optional().isArray().withMessage('Tags must be an array'),
], mailchimpController.bulkSyncContacts);
/**
 * GET /api/mailchimp/campaigns
 * Get campaigns
 */
router.get('/campaigns', auth_1.authenticate, [(0, express_validator_1.query)('listId').optional().isString().withMessage('List ID must be a string')], mailchimpController.getCampaigns);
/**
 * POST /api/mailchimp/campaigns
 * Create a new email campaign
 */
router.post('/campaigns', auth_1.authenticate, [
    (0, express_validator_1.body)('listId').isString().notEmpty().withMessage('List ID is required'),
    (0, express_validator_1.body)('title').isString().notEmpty().withMessage('Campaign title is required'),
    (0, express_validator_1.body)('subject').isString().notEmpty().withMessage('Subject line is required'),
    (0, express_validator_1.body)('fromName').isString().notEmpty().withMessage('From name is required'),
    (0, express_validator_1.body)('replyTo').isEmail().withMessage('Valid reply-to email is required'),
    (0, express_validator_1.body)('previewText').optional().isString().withMessage('Preview text must be a string'),
    (0, express_validator_1.body)('htmlContent').optional().isString().withMessage('HTML content must be a string'),
    (0, express_validator_1.body)('plainTextContent').optional().isString().withMessage('Plain text content must be a string'),
    (0, express_validator_1.body)('segmentId').optional().isNumeric().withMessage('Segment ID must be a number'),
    (0, express_validator_1.body)('sendTime').optional().isISO8601().withMessage('Send time must be a valid ISO 8601 date'),
], mailchimpController.createCampaign);
/**
 * POST /api/mailchimp/campaigns/:campaignId/send
 * Send a campaign immediately
 */
router.post('/campaigns/:campaignId/send', auth_1.authenticate, [(0, express_validator_1.param)('campaignId').isString().notEmpty().withMessage('Campaign ID is required')], mailchimpController.sendCampaign);
/**
 * POST /api/mailchimp/webhook
 * Mailchimp webhook handler (no auth - Mailchimp sends webhooks)
 */
router.post('/webhook', mailchimpController.handleWebhook);
exports.default = router;
//# sourceMappingURL=mailchimp.js.map