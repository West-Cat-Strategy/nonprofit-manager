"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptPortalInvitation = exports.validatePortalInvitation = exports.getPortalMe = exports.portalLogin = exports.portalSignup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const database_1 = __importDefault(require("../config/database"));
const jwt_1 = require("../config/jwt");
const constants_1 = require("../config/constants");
const portalActivityService_1 = require("../services/portalActivityService");
const buildPortalToken = (payload) => {
    return jsonwebtoken_1.default.sign({
        id: payload.id,
        email: payload.email,
        contactId: payload.contactId,
        type: 'portal',
    }, (0, jwt_1.getJwtSecret)(), { expiresIn: constants_1.JWT.ACCESS_TOKEN_EXPIRY });
};
const getOrCreateContactForSignup = async (data) => {
    const email = data.email.toLowerCase();
    const existing = await database_1.default.query('SELECT id FROM contacts WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }
    const result = await database_1.default.query(`INSERT INTO contacts (
      first_name, last_name, email, phone, created_by, modified_by
    ) VALUES ($1, $2, $3, $4, $5, $5)
    RETURNING id`, [data.firstName, data.lastName, email, data.phone || null, null]);
    return result.rows[0].id;
};
const portalSignup = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const payload = req.body;
        const email = payload.email.toLowerCase();
        const existingUser = await database_1.default.query('SELECT id FROM portal_users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Portal account already exists' });
        }
        const existingRequest = await database_1.default.query('SELECT id FROM portal_signup_requests WHERE email = $1 AND status = $2', [email, 'pending']);
        if (existingRequest.rows.length > 0) {
            return res.status(409).json({ error: 'Signup request already pending approval' });
        }
        const contactId = await getOrCreateContactForSignup(payload);
        const hashedPassword = await bcryptjs_1.default.hash(payload.password, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        const requestResult = await database_1.default.query(`INSERT INTO portal_signup_requests (contact_id, email, password_hash, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`, [contactId, email, hashedPassword, 'pending']);
        return res.status(201).json({
            status: 'pending',
            requestId: requestResult.rows[0].id,
            message: 'Signup request submitted. A staff member must approve your access.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.portalSignup = portalSignup;
const portalLogin = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        const result = await database_1.default.query(`SELECT id, email, password_hash, contact_id, status, is_verified
       FROM portal_users
       WHERE email = $1`, [email.toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is suspended' });
        }
        if (!user.is_verified) {
            return res.status(403).json({ error: 'Account pending verification' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        await database_1.default.query('UPDATE portal_users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        await (0, portalActivityService_1.logPortalActivity)({
            portalUserId: user.id,
            action: 'login.success',
            details: 'Portal user logged in',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
        const token = buildPortalToken({ id: user.id, email: user.email, contactId: user.contact_id });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                contactId: user.contact_id,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.portalLogin = portalLogin;
const getPortalMe = async (req, res, next) => {
    try {
        const portalUser = req.portalUser;
        const result = await database_1.default.query(`SELECT
        pu.id,
        pu.email,
        pu.contact_id,
        pu.status,
        pu.is_verified,
        pu.created_at,
        pu.last_login_at,
        c.first_name,
        c.last_name,
        c.phone,
        c.mobile_phone
       FROM portal_users pu
       LEFT JOIN contacts c ON c.id = pu.contact_id
       WHERE pu.id = $1`, [portalUser.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Portal user not found' });
        }
        return res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
};
exports.getPortalMe = getPortalMe;
const validatePortalInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;
        const result = await database_1.default.query(`SELECT id, email, contact_id, expires_at, accepted_at
       FROM portal_invitations
       WHERE token = $1`, [token]);
        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, error: 'Invitation not found' });
        }
        const invitation = result.rows[0];
        if (invitation.accepted_at) {
            return res.status(400).json({ valid: false, error: 'Invitation already accepted' });
        }
        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ valid: false, error: 'Invitation expired' });
        }
        return res.json({
            valid: true,
            invitation: {
                email: invitation.email,
                contactId: invitation.contact_id,
                expiresAt: invitation.expires_at,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.validatePortalInvitation = validatePortalInvitation;
const acceptPortalInvitation = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { token } = req.params;
        const { firstName, lastName, password } = req.body;
        const inviteResult = await database_1.default.query(`SELECT id, email, contact_id, created_by, expires_at, accepted_at
       FROM portal_invitations
       WHERE token = $1`, [token]);
        if (inviteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        const invitation = inviteResult.rows[0];
        if (invitation.accepted_at) {
            return res.status(400).json({ error: 'Invitation already accepted' });
        }
        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invitation expired' });
        }
        const existingUser = await database_1.default.query('SELECT id FROM portal_users WHERE email = $1', [
            invitation.email.toLowerCase(),
        ]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Portal account already exists' });
        }
        let contactId = invitation.contact_id;
        if (!contactId) {
            const contactResult = await database_1.default.query(`INSERT INTO contacts (
          first_name, last_name, email, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $4)
        RETURNING id`, [firstName, lastName, invitation.email.toLowerCase(), null]);
            contactId = contactResult.rows[0].id;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        const portalUserResult = await database_1.default.query(`INSERT INTO portal_users (
        contact_id, email, password_hash, status, is_verified, verified_at, verified_by
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id, email, contact_id`, [contactId, invitation.email.toLowerCase(), hashedPassword, 'active', true, invitation.created_by]);
        await database_1.default.query('UPDATE portal_invitations SET accepted_at = NOW() WHERE id = $1', [
            invitation.id,
        ]);
        const portalUser = portalUserResult.rows[0];
        const tokenValue = buildPortalToken({
            id: portalUser.id,
            email: portalUser.email,
            contactId: portalUser.contact_id,
        });
        return res.status(201).json({
            token: tokenValue,
            user: {
                id: portalUser.id,
                email: portalUser.email,
                contactId: portalUser.contact_id,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.acceptPortalInvitation = acceptPortalInvitation;
//# sourceMappingURL=portalAuthController.js.map