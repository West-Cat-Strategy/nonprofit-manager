"use strict";
/**
 * Invitation Service
 * Handles user invitation management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendInvitation = exports.revokeInvitation = exports.markInvitationAccepted = exports.validateInvitation = exports.getInvitationByToken = exports.getInvitationById = exports.getInvitations = exports.createInvitation = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
/**
 * Generate a secure random token for invitation URL
 */
const generateToken = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
/**
 * Map database row to invitation object
 */
const mapRowToInvitation = (row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    token: row.token,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    acceptedBy: row.accepted_by,
    isRevoked: row.is_revoked,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    message: row.message,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
});
/**
 * Create a new user invitation
 */
const createInvitation = async (data, createdBy) => {
    const token = generateToken();
    const expiresInDays = data.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    // Check if email already has a user account
    const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
        throw new Error('A user with this email already exists');
    }
    // Check if there's already a pending invitation for this email
    const existingInvitation = await database_1.default.query(`SELECT id FROM user_invitations
     WHERE email = $1 AND is_revoked = false AND accepted_at IS NULL AND expires_at > NOW()`, [data.email.toLowerCase()]);
    if (existingInvitation.rows.length > 0) {
        throw new Error('A pending invitation already exists for this email');
    }
    const result = await database_1.default.query(`INSERT INTO user_invitations (email, role, token, expires_at, message, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [data.email.toLowerCase(), data.role, token, expiresAt, data.message || null, createdBy]);
    logger_1.logger.info(`User invitation created for ${data.email}`, { createdBy, role: data.role });
    return mapRowToInvitation(result.rows[0]);
};
exports.createInvitation = createInvitation;
/**
 * Get all invitations (for admin listing)
 */
const getInvitations = async (options) => {
    const conditions = [];
    if (!options.includeExpired) {
        conditions.push('(expires_at > NOW() OR accepted_at IS NOT NULL)');
    }
    if (!options.includeAccepted) {
        conditions.push('accepted_at IS NULL');
    }
    if (!options.includeRevoked) {
        conditions.push('is_revoked = false');
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await database_1.default.query(`SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM user_invitations i
     LEFT JOIN users u ON i.created_by = u.id
     ${whereClause}
     ORDER BY i.created_at DESC`);
    return result.rows.map(mapRowToInvitation);
};
exports.getInvitations = getInvitations;
/**
 * Get invitation by ID
 */
const getInvitationById = async (id) => {
    const result = await database_1.default.query(`SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM user_invitations i
     LEFT JOIN users u ON i.created_by = u.id
     WHERE i.id = $1`, [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToInvitation(result.rows[0]);
};
exports.getInvitationById = getInvitationById;
/**
 * Get invitation by token (for acceptance flow)
 */
const getInvitationByToken = async (token) => {
    const result = await database_1.default.query(`SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
     FROM user_invitations i
     LEFT JOIN users u ON i.created_by = u.id
     WHERE i.token = $1`, [token]);
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToInvitation(result.rows[0]);
};
exports.getInvitationByToken = getInvitationByToken;
/**
 * Validate if an invitation can be accepted
 */
const validateInvitation = async (token) => {
    const invitation = await (0, exports.getInvitationByToken)(token);
    if (!invitation) {
        return { valid: false, invitation: null, error: 'Invitation not found' };
    }
    if (invitation.isRevoked) {
        return { valid: false, invitation, error: 'This invitation has been revoked' };
    }
    if (invitation.acceptedAt) {
        return { valid: false, invitation, error: 'This invitation has already been used' };
    }
    if (new Date() > invitation.expiresAt) {
        return { valid: false, invitation, error: 'This invitation has expired' };
    }
    // Check if email already has a user account (someone may have created one since invitation)
    const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [invitation.email]);
    if (existingUser.rows.length > 0) {
        return { valid: false, invitation, error: 'A user with this email already exists' };
    }
    return { valid: true, invitation };
};
exports.validateInvitation = validateInvitation;
/**
 * Mark invitation as accepted
 */
const markInvitationAccepted = async (invitationId, userId) => {
    await database_1.default.query(`UPDATE user_invitations
     SET accepted_at = NOW(), accepted_by = $1
     WHERE id = $2`, [userId, invitationId]);
    logger_1.logger.info(`Invitation ${invitationId} accepted`, { userId });
};
exports.markInvitationAccepted = markInvitationAccepted;
/**
 * Revoke an invitation
 */
const revokeInvitation = async (invitationId, revokedBy) => {
    const result = await database_1.default.query(`UPDATE user_invitations
     SET is_revoked = true, revoked_at = NOW(), revoked_by = $1
     WHERE id = $2 AND is_revoked = false AND accepted_at IS NULL
     RETURNING *`, [revokedBy, invitationId]);
    if (result.rows.length === 0) {
        return null;
    }
    logger_1.logger.info(`Invitation ${invitationId} revoked`, { revokedBy });
    return mapRowToInvitation(result.rows[0]);
};
exports.revokeInvitation = revokeInvitation;
/**
 * Resend an invitation (generates new token and expiry)
 */
const resendInvitation = async (invitationId, updatedBy) => {
    const newToken = generateToken();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);
    const result = await database_1.default.query(`UPDATE user_invitations
     SET token = $1, expires_at = $2
     WHERE id = $3 AND is_revoked = false AND accepted_at IS NULL
     RETURNING *`, [newToken, newExpiry, invitationId]);
    if (result.rows.length === 0) {
        return null;
    }
    logger_1.logger.info(`Invitation ${invitationId} resent with new token`, { updatedBy });
    return mapRowToInvitation(result.rows[0]);
};
exports.resendInvitation = resendInvitation;
//# sourceMappingURL=invitationService.js.map