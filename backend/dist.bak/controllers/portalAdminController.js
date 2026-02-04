"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPortalUserPassword = exports.getPortalUserActivity = exports.updatePortalUserStatus = exports.listPortalUsers = exports.listPortalInvitations = exports.createPortalInvitation = exports.rejectPortalSignupRequest = exports.approvePortalSignupRequest = exports.listPortalSignupRequests = void 0;
const crypto_1 = __importDefault(require("crypto"));
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const constants_1 = require("../config/constants");
const portalActivityService_1 = require("../services/portalActivityService");
const ensureAdmin = (req, res) => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return false;
    }
    return true;
};
const listPortalSignupRequests = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const result = await database_1.default.query(`SELECT psr.id, psr.email, psr.status, psr.requested_at, psr.reviewed_at,
              c.id as contact_id, c.first_name, c.last_name
       FROM portal_signup_requests psr
       LEFT JOIN contacts c ON c.id = psr.contact_id
       WHERE psr.status = 'pending'
       ORDER BY psr.requested_at ASC`);
        res.json({ requests: result.rows });
    }
    catch (error) {
        next(error);
    }
};
exports.listPortalSignupRequests = listPortalSignupRequests;
const approvePortalSignupRequest = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const { id } = req.params;
        const requestResult = await database_1.default.query(`SELECT id, email, password_hash, contact_id, status
       FROM portal_signup_requests
       WHERE id = $1`, [id]);
        if (requestResult.rows.length === 0) {
            res.status(404).json({ error: 'Signup request not found' });
            return;
        }
        const requestRow = requestResult.rows[0];
        if (requestRow.status !== 'pending') {
            res.status(400).json({ error: 'Signup request already processed' });
            return;
        }
        const existingUser = await database_1.default.query('SELECT id FROM portal_users WHERE email = $1', [
            requestRow.email.toLowerCase(),
        ]);
        if (existingUser.rows.length > 0) {
            res.status(409).json({ error: 'Portal account already exists' });
            return;
        }
        const portalUserResult = await database_1.default.query(`INSERT INTO portal_users (
        contact_id, email, password_hash, status, is_verified, verified_at, verified_by
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id, email, contact_id`, [requestRow.contact_id, requestRow.email.toLowerCase(), requestRow.password_hash, 'active', true, req.user.id]);
        await database_1.default.query(`UPDATE portal_signup_requests
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $1`, [id, req.user.id]);
        res.json({
            message: 'Portal request approved',
            portalUser: portalUserResult.rows[0],
        });
    }
    catch (error) {
        next(error);
    }
};
exports.approvePortalSignupRequest = approvePortalSignupRequest;
const rejectPortalSignupRequest = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const { id } = req.params;
        const { notes } = req.body;
        const requestResult = await database_1.default.query(`SELECT id, status FROM portal_signup_requests WHERE id = $1`, [id]);
        if (requestResult.rows.length === 0) {
            res.status(404).json({ error: 'Signup request not found' });
            return;
        }
        if (requestResult.rows[0].status !== 'pending') {
            res.status(400).json({ error: 'Signup request already processed' });
            return;
        }
        await database_1.default.query(`UPDATE portal_signup_requests
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2, review_notes = $3
       WHERE id = $1`, [id, req.user.id, notes || null]);
        res.json({ message: 'Portal request rejected' });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectPortalSignupRequest = rejectPortalSignupRequest;
const generatePortalInviteToken = () => crypto_1.default.randomBytes(32).toString('hex');
const createPortalInvitation = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email, contact_id, expiresInDays } = req.body;
        const existingUser = await database_1.default.query('SELECT id FROM portal_users WHERE email = $1', [
            email.toLowerCase(),
        ]);
        if (existingUser.rows.length > 0) {
            res.status(409).json({ error: 'Portal account already exists' });
            return;
        }
        const existingInvite = await database_1.default.query(`SELECT id FROM portal_invitations
       WHERE email = $1 AND accepted_at IS NULL AND expires_at > NOW()`, [email.toLowerCase()]);
        if (existingInvite.rows.length > 0) {
            res.status(409).json({ error: 'Pending portal invitation already exists' });
            return;
        }
        const token = generatePortalInviteToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));
        const inviteResult = await database_1.default.query(`INSERT INTO portal_invitations (email, contact_id, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, contact_id, token, expires_at`, [email.toLowerCase(), contact_id || null, token, expiresAt, req.user.id]);
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        const inviteUrl = `${baseUrl}/portal/accept-invitation/${token}`;
        res.status(201).json({
            invitation: inviteResult.rows[0],
            inviteUrl,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createPortalInvitation = createPortalInvitation;
const listPortalInvitations = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const result = await database_1.default.query(`SELECT id, email, contact_id, expires_at, created_at, accepted_at
       FROM portal_invitations
       ORDER BY created_at DESC`);
        res.json({ invitations: result.rows });
    }
    catch (error) {
        next(error);
    }
};
exports.listPortalInvitations = listPortalInvitations;
const listPortalUsers = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const params = [];
        let whereClause = '';
        if (search) {
            params.push(`%${search}%`);
            whereClause = `WHERE (
        pu.email ILIKE $1 OR
        c.first_name ILIKE $1 OR
        c.last_name ILIKE $1 OR
        CONCAT(c.first_name, ' ', c.last_name) ILIKE $1
      )`;
        }
        const result = await database_1.default.query(`SELECT
        pu.id,
        pu.email,
        pu.status,
        pu.is_verified,
        pu.created_at,
        pu.last_login_at,
        pu.contact_id,
        c.first_name,
        c.last_name
       FROM portal_users pu
       LEFT JOIN contacts c ON c.id = pu.contact_id
       ${whereClause}
       ORDER BY pu.created_at DESC
       LIMIT 100`, params);
        res.json({ users: result.rows });
    }
    catch (error) {
        next(error);
    }
};
exports.listPortalUsers = listPortalUsers;
const updatePortalUserStatus = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !['active', 'suspended'].includes(status)) {
            res.status(400).json({ error: 'Status must be active or suspended' });
            return;
        }
        const result = await database_1.default.query(`UPDATE portal_users
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, status, is_verified, last_login_at`, [status, id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Portal user not found' });
            return;
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePortalUserStatus = updatePortalUserStatus;
const getPortalUserActivity = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const { id } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const activity = await (0, portalActivityService_1.getPortalActivity)(id, Number.isNaN(limit) ? 20 : limit);
        res.json({ activity });
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalUserActivity = getPortalUserActivity;
const resetPortalUserPassword = async (req, res, next) => {
    try {
        if (!ensureAdmin(req, res))
            return;
        const { portalUserId, password } = req.body;
        const hashed = await bcryptjs_1.default.hash(password, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        await database_1.default.query('UPDATE portal_users SET password_hash = $1 WHERE id = $2', [
            hashed,
            portalUserId,
        ]);
        res.json({ message: 'Portal user password updated' });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPortalUserPassword = resetPortalUserPassword;
//# sourceMappingURL=portalAdminController.js.map