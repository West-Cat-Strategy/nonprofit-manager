"use strict";
/**
 * Contact Phones Controller
 * Handles HTTP requests for contact phone numbers
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
exports.deleteContactPhone = exports.updateContactPhone = exports.createContactPhone = exports.getContactPhoneById = exports.getContactPhones = void 0;
const contactPhoneService = __importStar(require("../services/contactPhoneService"));
/**
 * GET /api/contacts/:contactId/phones
 * Get all phone numbers for a contact
 */
const getContactPhones = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const phones = await contactPhoneService.getContactPhones(contactId);
        res.json(phones);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactPhones = getContactPhones;
/**
 * GET /api/contacts/phones/:phoneId
 * Get a single phone number by ID
 */
const getContactPhoneById = async (req, res, next) => {
    try {
        const { phoneId } = req.params;
        const phone = await contactPhoneService.getContactPhoneById(phoneId);
        if (!phone) {
            res.status(404).json({ error: 'Phone number not found' });
            return;
        }
        res.json(phone);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactPhoneById = getContactPhoneById;
/**
 * POST /api/contacts/:contactId/phones
 * Create a new phone number for a contact
 */
const createContactPhone = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const userId = req.user.id;
        const phone = await contactPhoneService.createContactPhone(contactId, req.body, userId);
        res.status(201).json(phone);
    }
    catch (error) {
        if (error.message === 'This phone number already exists for this contact') {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.createContactPhone = createContactPhone;
/**
 * PUT /api/contacts/phones/:phoneId
 * Update a phone number
 */
const updateContactPhone = async (req, res, next) => {
    try {
        const { phoneId } = req.params;
        const userId = req.user.id;
        const phone = await contactPhoneService.updateContactPhone(phoneId, req.body, userId);
        if (!phone) {
            res.status(404).json({ error: 'Phone number not found' });
            return;
        }
        res.json(phone);
    }
    catch (error) {
        if (error.message === 'This phone number already exists for this contact') {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.updateContactPhone = updateContactPhone;
/**
 * DELETE /api/contacts/phones/:phoneId
 * Delete a phone number
 */
const deleteContactPhone = async (req, res, next) => {
    try {
        const { phoneId } = req.params;
        const success = await contactPhoneService.deleteContactPhone(phoneId);
        if (!success) {
            res.status(404).json({ error: 'Phone number not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContactPhone = deleteContactPhone;
//# sourceMappingURL=contactPhonesController.js.map