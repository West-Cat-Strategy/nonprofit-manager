"use strict";
/**
 * Contact Relationships Controller
 * Handles HTTP requests for contact relationships
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
exports.deleteContactRelationship = exports.updateContactRelationship = exports.createContactRelationship = exports.getContactRelationshipById = exports.getContactRelationships = void 0;
const contactRelationshipService = __importStar(require("../services/contactRelationshipService"));
/**
 * GET /api/contacts/:contactId/relationships
 * Get all relationships for a contact
 */
const getContactRelationships = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const relationships = await contactRelationshipService.getContactRelationships(contactId);
        res.json(relationships);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactRelationships = getContactRelationships;
/**
 * GET /api/contacts/relationships/:relationshipId
 * Get a single relationship by ID
 */
const getContactRelationshipById = async (req, res, next) => {
    try {
        const { relationshipId } = req.params;
        const relationship = await contactRelationshipService.getContactRelationshipById(relationshipId);
        if (!relationship) {
            res.status(404).json({ error: 'Relationship not found' });
            return;
        }
        res.json(relationship);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactRelationshipById = getContactRelationshipById;
/**
 * POST /api/contacts/:contactId/relationships
 * Create a new relationship
 */
const createContactRelationship = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const userId = req.user.id;
        const relationship = await contactRelationshipService.createContactRelationship(contactId, req.body, userId);
        res.status(201).json(relationship);
    }
    catch (error) {
        if (error.message.includes('already exists')) {
            res.status(409).json({ error: error.message });
            return;
        }
        if (error.message.includes('not found')) {
            res.status(404).json({ error: error.message });
            return;
        }
        next(error);
    }
};
exports.createContactRelationship = createContactRelationship;
/**
 * PUT /api/contacts/relationships/:relationshipId
 * Update a relationship
 */
const updateContactRelationship = async (req, res, next) => {
    try {
        const { relationshipId } = req.params;
        const userId = req.user.id;
        const relationship = await contactRelationshipService.updateContactRelationship(relationshipId, req.body, userId);
        if (!relationship) {
            res.status(404).json({ error: 'Relationship not found' });
            return;
        }
        res.json(relationship);
    }
    catch (error) {
        next(error);
    }
};
exports.updateContactRelationship = updateContactRelationship;
/**
 * DELETE /api/contacts/relationships/:relationshipId
 * Soft delete a relationship
 */
const deleteContactRelationship = async (req, res, next) => {
    try {
        const { relationshipId } = req.params;
        const success = await contactRelationshipService.deleteContactRelationship(relationshipId);
        if (!success) {
            res.status(404).json({ error: 'Relationship not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContactRelationship = deleteContactRelationship;
//# sourceMappingURL=contactRelationshipsController.js.map