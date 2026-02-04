"use strict";
/**
 * Invitation Controller
 * Handles user invitation endpoints
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
exports.resendInvitation = exports.revokeInvitation = exports.acceptInvitation = exports.validateInvitation = exports.getInvitationById = exports.getInvitations = exports.createInvitation = void 0;
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const jwt_1 = require("../config/jwt");
const constants_1 = require("../config/constants");
const invitationService = __importStar(require("../services/invitationService"));
const userRoleService_1 = require("../services/userRoleService");
/**
 * POST /api/invitations
 * Create a new invitation (admin only)
 */
const createInvitation = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, role, message, expiresInDays } = req.body;
        const invitation = await invitationService.createInvitation({ email, role, message, expiresInDays }, req.user.id);
        // Generate the invitation URL (frontend will need to handle this route)
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;
        return res.status(201).json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
                message: invitation.message,
                createdAt: invitation.createdAt,
            },
            inviteUrl,
        });
    }
    catch (error) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        next(error);
    }
};
exports.createInvitation = createInvitation;
/**
 * GET /api/invitations
 * List all invitations (admin only)
 */
const getInvitations = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const includeExpired = req.query.includeExpired === 'true';
        const includeAccepted = req.query.includeAccepted === 'true';
        const includeRevoked = req.query.includeRevoked === 'true';
        const invitations = await invitationService.getInvitations({
            includeExpired,
            includeAccepted,
            includeRevoked,
        });
        return res.json({ invitations });
    }
    catch (error) {
        next(error);
    }
};
exports.getInvitations = getInvitations;
/**
 * GET /api/invitations/:id
 * Get invitation by ID (admin only)
 */
const getInvitationById = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { id } = req.params;
        const invitation = await invitationService.getInvitationById(id);
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        return res.json({ invitation });
    }
    catch (error) {
        next(error);
    }
};
exports.getInvitationById = getInvitationById;
/**
 * GET /api/invitations/validate/:token
 * Validate invitation token (public - for acceptance flow)
 */
const validateInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;
        const result = await invitationService.validateInvitation(token);
        if (!result.valid) {
            return res.status(400).json({
                valid: false,
                error: result.error,
            });
        }
        // Return limited invitation info for the acceptance form
        return res.json({
            valid: true,
            invitation: {
                email: result.invitation.email,
                role: result.invitation.role,
                message: result.invitation.message,
                invitedBy: result.invitation.createdByName,
                expiresAt: result.invitation.expiresAt,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.validateInvitation = validateInvitation;
/**
 * POST /api/invitations/accept/:token
 * Accept invitation and create user account (public)
 */
const acceptInvitation = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { token } = req.params;
        const { firstName, lastName, password } = req.body;
        // Validate the invitation
        const validation = await invitationService.validateInvitation(token);
        if (!validation.valid || !validation.invitation) {
            return res.status(400).json({ error: validation.error || 'Invalid invitation' });
        }
        const invitation = validation.invitation;
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        // Create the user
        const userResult = await database_1.default.query(`INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at, created_by)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
       RETURNING id, email, first_name, last_name, role, is_active, created_at`, [invitation.email, hashedPassword, firstName, lastName, invitation.role, invitation.createdBy]);
        const newUser = userResult.rows[0];
        await (0, userRoleService_1.syncUserRole)(newUser.id, newUser.role);
        // Mark invitation as accepted
        await invitationService.markInvitationAccepted(invitation.id, newUser.id);
        // Generate JWT token for automatic login
        const jwtToken = jsonwebtoken_1.default.sign({
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
        }, (0, jwt_1.getJwtSecret)(), { expiresIn: constants_1.JWT.ACCESS_TOKEN_EXPIRY });
        logger_1.logger.info(`User created via invitation: ${newUser.email}`, {
            userId: newUser.id,
            invitationId: invitation.id,
        });
        return res.status(201).json({
            message: 'Account created successfully',
            token: jwtToken,
            user: {
                id: newUser.id,
                email: newUser.email,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                role: newUser.role,
                profilePicture: null,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.acceptInvitation = acceptInvitation;
/**
 * DELETE /api/invitations/:id
 * Revoke an invitation (admin only)
 */
const revokeInvitation = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { id } = req.params;
        const invitation = await invitationService.revokeInvitation(id, req.user.id);
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found or already revoked/accepted' });
        }
        return res.json({ message: 'Invitation revoked successfully', invitation });
    }
    catch (error) {
        next(error);
    }
};
exports.revokeInvitation = revokeInvitation;
/**
 * POST /api/invitations/:id/resend
 * Resend an invitation with new token (admin only)
 */
const resendInvitation = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { id } = req.params;
        const invitation = await invitationService.resendInvitation(id, req.user.id);
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found or already revoked/accepted' });
        }
        // Generate the new invitation URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;
        return res.json({
            message: 'Invitation resent successfully',
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                expiresAt: invitation.expiresAt,
            },
            inviteUrl,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resendInvitation = resendInvitation;
//# sourceMappingURL=invitationController.js.map