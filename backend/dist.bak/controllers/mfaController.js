"use strict";
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
exports.issueTotpMfaChallenge = exports.completeTotpLogin = exports.disableTotp = exports.enableTotp = exports.enrollTotp = exports.getSecurityOverview = void 0;
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const jwt_1 = require("../config/jwt");
const logger_1 = require("../config/logger");
const accountLockout_1 = require("../middleware/accountLockout");
const constants_1 = require("../config/constants");
const encryption_1 = require("../utils/encryption");
const TOTP_PERIOD_SECONDS = 30;
const TOTP_WINDOW = 1;
const TOTP_EPOCH_TOLERANCE_SECONDS = TOTP_PERIOD_SECONDS * TOTP_WINDOW;
const MFA_TOKEN_EXPIRY = Math.floor(constants_1.TIME.FIVE_MINUTES / 1000);
const TOTP_ISSUER = process.env.TOTP_ISSUER || 'Nonprofit Manager';
const getDefaultOrganizationId = async () => {
    const result = await database_1.default.query(`SELECT id
     FROM accounts
     WHERE account_type = 'organization'
     ORDER BY created_at ASC
     LIMIT 1`);
    return result.rows[0]?.id || null;
};
const normalizeTotpCode = (code) => code.replace(/\s+/g, '');
const loadOtplib = async () => Promise.resolve().then(() => __importStar(require('otplib')));
const issueAuthTokens = (user) => {
    const jwtSecret = (0, jwt_1.getJwtSecret)();
    return {
        token: jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: constants_1.JWT.ACCESS_TOKEN_EXPIRY }),
        refreshToken: jsonwebtoken_1.default.sign({ id: user.id, type: 'refresh' }, jwtSecret, { expiresIn: constants_1.JWT.REFRESH_TOKEN_EXPIRY }),
    };
};
const issueMfaToken = (user) => {
    const jwtSecret = (0, jwt_1.getJwtSecret)();
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, type: 'mfa', method: 'totp' }, jwtSecret, { expiresIn: MFA_TOKEN_EXPIRY });
};
const getSecurityOverview = async (req, res, next) => {
    try {
        const totpResult = await database_1.default.query('SELECT mfa_totp_enabled FROM users WHERE id = $1', [req.user.id]);
        if (totpResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const passkeyResult = await database_1.default.query(`SELECT id, name, created_at, last_used_at
       FROM user_webauthn_credentials
       WHERE user_id = $1
       ORDER BY created_at DESC`, [req.user.id]);
        return res.json({
            totpEnabled: !!totpResult.rows[0].mfa_totp_enabled,
            passkeys: passkeyResult.rows.map((r) => ({
                id: r.id,
                name: r.name,
                createdAt: r.created_at,
                lastUsedAt: r.last_used_at,
            })),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getSecurityOverview = getSecurityOverview;
const enrollTotp = async (req, res, next) => {
    try {
        const result = await database_1.default.query('SELECT email, mfa_totp_enabled FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (result.rows[0].mfa_totp_enabled) {
            return res.status(409).json({ error: '2FA is already enabled' });
        }
        const { generateSecret, generateURI } = await loadOtplib();
        const secret = generateSecret();
        const otpauthUrl = generateURI({
            issuer: TOTP_ISSUER,
            label: result.rows[0].email,
            secret,
            period: TOTP_PERIOD_SECONDS,
        });
        await database_1.default.query(`UPDATE users
       SET mfa_totp_pending_secret_enc = $1,
           updated_at = NOW()
       WHERE id = $2`, [(0, encryption_1.encrypt)(secret), req.user.id]);
        return res.json({
            issuer: TOTP_ISSUER,
            otpauthUrl,
            secret,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.enrollTotp = enrollTotp;
const enableTotp = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { code } = req.body;
        const result = await database_1.default.query('SELECT mfa_totp_enabled, mfa_totp_pending_secret_enc FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (result.rows[0].mfa_totp_enabled) {
            return res.status(409).json({ error: '2FA is already enabled' });
        }
        if (!result.rows[0].mfa_totp_pending_secret_enc) {
            return res.status(400).json({ error: 'No pending 2FA enrollment. Start setup first.' });
        }
        const secret = (0, encryption_1.decrypt)(result.rows[0].mfa_totp_pending_secret_enc);
        const { verify } = await loadOtplib();
        const verifyResult = await verify({
            secret,
            token: normalizeTotpCode(code),
            period: TOTP_PERIOD_SECONDS,
            epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
        });
        if (!verifyResult.valid) {
            return res.status(401).json({ error: 'Invalid authentication code' });
        }
        await database_1.default.query(`UPDATE users
       SET mfa_totp_enabled = TRUE,
           mfa_totp_secret_enc = mfa_totp_pending_secret_enc,
           mfa_totp_pending_secret_enc = NULL,
           mfa_totp_enabled_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`, [req.user.id]);
        logger_1.logger.info('TOTP 2FA enabled', { userId: req.user.id });
        return res.json({ totpEnabled: true });
    }
    catch (error) {
        next(error);
    }
};
exports.enableTotp = enableTotp;
const disableTotp = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { password, code } = req.body;
        const result = await database_1.default.query(`SELECT id, email, role, password_hash, first_name, last_name,
              mfa_totp_enabled, mfa_totp_secret_enc
       FROM users WHERE id = $1`, [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        if (!user.mfa_totp_enabled || !user.mfa_totp_secret_enc) {
            return res.status(409).json({ error: '2FA is not enabled' });
        }
        const passwordOk = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const secret = (0, encryption_1.decrypt)(user.mfa_totp_secret_enc);
        const { verify } = await loadOtplib();
        const verifyResult = await verify({
            secret,
            token: normalizeTotpCode(code),
            period: TOTP_PERIOD_SECONDS,
            epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
        });
        if (!verifyResult.valid) {
            return res.status(401).json({ error: 'Invalid authentication code' });
        }
        await database_1.default.query(`UPDATE users
       SET mfa_totp_enabled = FALSE,
           mfa_totp_secret_enc = NULL,
           mfa_totp_pending_secret_enc = NULL,
           mfa_totp_enabled_at = NULL,
           updated_at = NOW()
       WHERE id = $1`, [req.user.id]);
        logger_1.logger.info('TOTP 2FA disabled', { userId: req.user.id });
        return res.json({ totpEnabled: false });
    }
    catch (error) {
        next(error);
    }
};
exports.disableTotp = disableTotp;
const completeTotpLogin = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, mfaToken, code } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(mfaToken, (0, jwt_1.getJwtSecret)());
        }
        catch {
            return res.status(401).json({ error: 'Invalid or expired MFA token' });
        }
        if (decoded.type !== 'mfa' || decoded.method !== 'totp') {
            return res.status(401).json({ error: 'Invalid MFA token' });
        }
        if (decoded.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(401).json({ error: 'Invalid MFA token' });
        }
        const userResult = await database_1.default.query(`SELECT id, email, role, first_name, last_name, profile_picture, mfa_totp_enabled, mfa_totp_secret_enc
       FROM users WHERE id = $1`, [decoded.id]);
        if (userResult.rows.length === 0) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, undefined, clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = userResult.rows[0];
        if (!user.mfa_totp_enabled || !user.mfa_totp_secret_enc) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, user.id, clientIp);
            return res.status(400).json({ error: '2FA is not enabled for this user' });
        }
        const secret = (0, encryption_1.decrypt)(user.mfa_totp_secret_enc);
        const { verify } = await loadOtplib();
        const verifyResult = await verify({
            secret,
            token: normalizeTotpCode(code),
            period: TOTP_PERIOD_SECONDS,
            epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
        });
        if (!verifyResult.valid) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, user.id, clientIp);
            return res.status(401).json({ error: 'Invalid authentication code' });
        }
        await (0, accountLockout_1.trackLoginAttempt)(email, true, user.id, clientIp);
        const { token, refreshToken } = issueAuthTokens(user);
        const organizationId = await getDefaultOrganizationId();
        return res.json({
            token,
            refreshToken,
            organizationId,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                profilePicture: user.profile_picture || null,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.completeTotpLogin = completeTotpLogin;
const issueTotpMfaChallenge = (user) => {
    const mfaToken = issueMfaToken(user);
    return {
        mfaRequired: true,
        method: 'totp',
        mfaToken,
    };
};
exports.issueTotpMfaChallenge = issueTotpMfaChallenge;
//# sourceMappingURL=mfaController.js.map