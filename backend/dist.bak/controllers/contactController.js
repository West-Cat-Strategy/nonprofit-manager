"use strict";
/**
 * Contact Controller
 * Handles HTTP requests for contact management
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteContact = exports.getContactRoles = exports.updateContact = exports.createContact = exports.getContactById = exports.getContacts = void 0;
const contactService_1 = require("../services/contactService");
const contactRoleService_1 = require("../services/contactRoleService");
const database_1 = __importDefault(require("../config/database"));
const invitationService = __importStar(require("../services/invitationService"));
const userRoleService_1 = require("../services/userRoleService");
const queryHelpers_1 = require("../utils/queryHelpers");
const responseHelpers_1 = require("../utils/responseHelpers");
const contactService = new contactService_1.ContactService(database_1.default);
const contactRoleService = new contactRoleService_1.ContactRoleService(database_1.default);
const STAFF_ROLE_MAP = {
    'Executive Director': 'admin',
    Staff: 'staff',
};
const getStaffRoleForContact = (roles) => {
    if (roles.includes('Executive Director'))
        return STAFF_ROLE_MAP['Executive Director'];
    if (roles.includes('Staff'))
        return STAFF_ROLE_MAP['Staff'];
    return null;
};
const ensureStaffUserAccount = async (contactId, roles, createdBy) => {
    const targetRole = getStaffRoleForContact(roles);
    if (!targetRole)
        return null;
    const contactResult = await database_1.default.query('SELECT email, first_name, last_name FROM contacts WHERE id = $1', [contactId]);
    const contact = contactResult.rows[0];
    if (!contact?.email) {
        throw new Error('Staff roles require a contact email to create an account');
    }
    const existingUser = await database_1.default.query('SELECT id, role FROM users WHERE email = $1', [
        contact.email.toLowerCase(),
    ]);
    if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0];
        if (user.role !== targetRole) {
            await database_1.default.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
                targetRole,
                user.id,
            ]);
        }
        await (0, userRoleService_1.syncUserRole)(user.id, targetRole, database_1.default);
        return { role: targetRole };
    }
    try {
        const invitation = await invitationService.createInvitation({
            email: contact.email,
            role: targetRole,
            message: `Auto-invite created from contact role assignment for ${contact.first_name} ${contact.last_name}`,
        }, createdBy);
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;
        return { inviteUrl, role: targetRole };
    }
    catch (error) {
        if (error?.message?.includes('pending invitation')) {
            return { role: targetRole };
        }
        throw error;
    }
};
/**
 * GET /api/contacts
 * Get all contacts with filtering and pagination
 */
const getRoleFilter = (value) => {
    if (value === 'staff' || value === 'volunteer' || value === 'board')
        return value;
    return undefined;
};
const getContacts = async (req, res, next) => {
    try {
        const filters = {
            search: (0, queryHelpers_1.getString)(req.query.search),
            role: getRoleFilter(req.query.role),
            account_id: (0, queryHelpers_1.getString)(req.query.account_id),
            is_active: (0, queryHelpers_1.getBoolean)(req.query.is_active),
        };
        const pagination = {
            page: (0, queryHelpers_1.getString)(req.query.page) ? parseInt(req.query.page) : undefined,
            limit: (0, queryHelpers_1.getString)(req.query.limit) ? parseInt(req.query.limit) : undefined,
            sort_by: (0, queryHelpers_1.getString)(req.query.sort_by),
            sort_order: (0, queryHelpers_1.getString)(req.query.sort_order),
        };
        const scope = req.dataScope?.filter;
        const result = await contactService.getContacts(filters, pagination, scope);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getContacts = getContacts;
/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
const getContactById = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        const contact = scope
            ? await contactService.getContactByIdWithScope(req.params.id, scope)
            : await contactService.getContactById(req.params.id);
        if (!contact) {
            (0, responseHelpers_1.notFound)(res, 'Contact');
            return;
        }
        const roles = await contactRoleService.getRolesForContact(req.params.id);
        res.json({ ...contact, roles: roles.map((role) => role.name) });
    }
    catch (error) {
        next(error);
    }
};
exports.getContactById = getContactById;
/**
 * POST /api/contacts
 * Create new contact
 */
const createContact = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { roles = [], ...contactData } = req.body;
        const contact = await contactService.createContact(contactData, userId);
        let assignedRoles = [];
        let staffInvitation = null;
        if (Array.isArray(roles)) {
            const roleRecords = await contactRoleService.setRolesForContact(contact.contact_id, roles, userId);
            assignedRoles = roleRecords.map((role) => role.name);
            if (assignedRoles.length > 0) {
                staffInvitation = await ensureStaffUserAccount(contact.contact_id, assignedRoles, userId);
            }
        }
        res.status(201).json({ ...contact, roles: assignedRoles, staffInvitation });
    }
    catch (error) {
        next(error);
    }
};
exports.createContact = createContact;
/**
 * PUT /api/contacts/:id
 * Update contact
 */
const updateContact = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedContact = await contactService.getContactByIdWithScope(req.params.id, scope);
            if (!scopedContact) {
                (0, responseHelpers_1.notFound)(res, 'Contact');
                return;
            }
        }
        const userId = req.user.id;
        const { roles, ...contactData } = req.body;
        const contact = await contactService.updateContact(req.params.id, contactData, userId);
        if (!contact) {
            (0, responseHelpers_1.notFound)(res, 'Contact');
            return;
        }
        let assignedRoles;
        let staffInvitation = null;
        if (Array.isArray(roles)) {
            const roleRecords = await contactRoleService.setRolesForContact(req.params.id, roles, userId);
            assignedRoles = roleRecords.map((role) => role.name);
            if (assignedRoles.length > 0) {
                staffInvitation = await ensureStaffUserAccount(req.params.id, assignedRoles, userId);
            }
        }
        else {
            const roleRecords = await contactRoleService.getRolesForContact(req.params.id);
            assignedRoles = roleRecords.map((role) => role.name);
        }
        res.json({ ...contact, roles: assignedRoles, staffInvitation });
    }
    catch (error) {
        next(error);
    }
};
exports.updateContact = updateContact;
/**
 * GET /api/contacts/roles
 * Get available contact roles
 */
const getContactRoles = async (_req, res, next) => {
    try {
        const roles = await contactRoleService.getAllRoles();
        res.json({ roles });
    }
    catch (error) {
        next(error);
    }
};
exports.getContactRoles = getContactRoles;
/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
const deleteContact = async (req, res, next) => {
    try {
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedContact = await contactService.getContactByIdWithScope(req.params.id, scope);
            if (!scopedContact) {
                (0, responseHelpers_1.notFound)(res, 'Contact');
                return;
            }
        }
        const userId = req.user.id;
        const success = await contactService.deleteContact(req.params.id, userId);
        if (!success) {
            (0, responseHelpers_1.notFound)(res, 'Contact');
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteContact = deleteContact;
//# sourceMappingURL=contactController.js.map