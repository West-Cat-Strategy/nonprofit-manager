"use strict";
/**
 * Contact Emails Controller
 * Handles HTTP requests for contact email addresses
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
exports.deleteContactEmail = exports.updateContactEmail = exports.createContactEmail = exports.getContactEmailById = exports.getContactEmails = void 0;
const contactEmailService = __importStar(require("../services/contactEmailService"));
/**
 * GET /api/contacts/:contactId/emails
 * Get all email addresses for a contact
 */
const getContactEmails = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const emails = await contactEmailService.getContactEmails(contactId);
        res.json(emails);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactEmails = getContactEmails;
/**
 * GET /api/contacts/emails/:emailId
 * Get a single email address by ID
 */
const getContactEmailById = async (req, res, next) => {
    try {
        const { emailId } = req.params;
        const email = await contactEmailService.getContactEmailById(emailId);
        if (!email) {
            res.status(404).json({ error: 'Email address not found' });
            return;
        }
        res.json(email);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactEmailById = getContactEmailById;
/**
 * POST /api/contacts/:contactId/emails
 * Create a new email address for a contact
 */
const createContactEmail = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const userId = req.user.id;
        const email = await contactEmailService.createContactEmail(contactId, req.body, userId);
        res.status(201).json(email);
    }
    catch (error) {
        if (error.message.includes('already exists')) {
            res.status(409).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.createContactEmail = createContactEmail;
/**
 * PUT /api/contacts/emails/:emailId
 * Update an email address
 */
const updateContactEmail = async (req, res, next) => {
    try {
        const { emailId } = req.params;
        const userId = req.user.id;
        const email = await contactEmailService.updateContactEmail(emailId, req.body, userId);
        if (!email) {
            res.status(404).json({ error: 'Email address not found' });
            return;
        }
        res.json(email);
    }
    catch (error) {
        if (error.message.includes('already exists')) {
            res.status(409).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.updateContactEmail = updateContactEmail;
/**
 * DELETE /api/contacts/emails/:emailId
 * Delete an email address
 */
const deleteContactEmail = async (req, res, next) => {
    try {
        const { emailId } = req.params;
        const success = await contactEmailService.deleteContactEmail(emailId);
        if (!success) {
            res.status(404).json({ error: 'Email address not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContactEmail = deleteContactEmail;
//# sourceMappingURL=contactEmailsController.js.map