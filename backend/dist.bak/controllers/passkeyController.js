"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginVerify = exports.loginOptions = exports.registrationVerify = exports.registrationOptions = exports.deletePasskey = exports.listPasskeys = void 0;
const express_validator_1 = require("express-validator");
const server_1 = require("@simplewebauthn/server");
const database_1 = __importDefault(require("../config/database"));
const webauthn_1 = require("../config/webauthn");
const constants_1 = require("../config/constants");
const base64url_1 = require("../utils/base64url");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../config/jwt");
const constants_2 = require("../config/constants");
const accountLockout_1 = require("../middleware/accountLockout");
const CHALLENGE_TTL_MS = constants_1.TIME.FIVE_MINUTES;
const issueAuthTokens = (user) => {
    const jwtSecret = (0, jwt_1.getJwtSecret)();
    return {
        token: jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, {
            expiresIn: constants_2.JWT.ACCESS_TOKEN_EXPIRY,
        }),
        refreshToken: jsonwebtoken_1.default.sign({ id: user.id, type: 'refresh' }, jwtSecret, {
            expiresIn: constants_2.JWT.REFRESH_TOKEN_EXPIRY,
        }),
    };
};
const getDefaultOrganizationId = async () => {
    const result = await database_1.default.query(`SELECT id
     FROM accounts
     WHERE account_type = 'organization'
     ORDER BY created_at ASC
     LIMIT 1`);
    return result.rows[0]?.id || null;
};
const listPasskeys = async (req, res, next) => {
    try {
        const result = await database_1.default.query(`SELECT id, name, created_at, last_used_at
       FROM user_webauthn_credentials
       WHERE user_id = $1
       ORDER BY created_at DESC`, [req.user.id]);
        return res.json({
            passkeys: result.rows.map((r) => ({
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
exports.listPasskeys = listPasskeys;
const deletePasskey = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await database_1.default.query('DELETE FROM user_webauthn_credentials WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Passkey not found' });
        }
        return res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deletePasskey = deletePasskey;
const registrationOptions = async (req, res, next) => {
    try {
        const { rpID, rpName } = (0, webauthn_1.getWebAuthnConfig)();
        const userResult = await database_1.default.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        const creds = await database_1.default.query('SELECT credential_id FROM user_webauthn_credentials WHERE user_id = $1', [user.id]);
        const options = await (0, server_1.generateRegistrationOptions)({
            rpID,
            rpName,
            userID: Buffer.from(user.id),
            userName: user.email,
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
            excludeCredentials: creds.rows.map((r) => ({
                id: r.credential_id,
            })),
        });
        const challengeInsert = await database_1.default.query(`INSERT INTO user_webauthn_challenges (user_id, challenge, type, expires_at)
       VALUES ($1, $2, 'registration', NOW() + ($3 * INTERVAL '1 millisecond'))
       RETURNING id, challenge`, [user.id, options.challenge, CHALLENGE_TTL_MS]);
        return res.json({ challengeId: challengeInsert.rows[0].id, options });
    }
    catch (error) {
        next(error);
    }
};
exports.registrationOptions = registrationOptions;
const registrationVerify = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { origins, rpID } = (0, webauthn_1.getWebAuthnConfig)();
        const { challengeId, credential, name } = req.body;
        const challengeResult = await database_1.default.query(`SELECT id, user_id, challenge, type, expires_at
       FROM user_webauthn_challenges
       WHERE id = $1`, [challengeId]);
        if (challengeResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired challenge' });
        }
        const challenge = challengeResult.rows[0];
        if (challenge.type !== 'registration' || challenge.user_id !== req.user.id) {
            return res.status(400).json({ error: 'Invalid or expired challenge' });
        }
        if (new Date() > new Date(challenge.expires_at)) {
            await database_1.default.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);
            return res.status(400).json({ error: 'Invalid or expired challenge' });
        }
        const verification = await (0, server_1.verifyRegistrationResponse)({
            response: credential,
            expectedChallenge: challenge.challenge,
            expectedOrigin: origins,
            expectedRPID: rpID,
            requireUserVerification: false,
        });
        if (!verification.verified || !verification.registrationInfo) {
            return res.status(400).json({ error: 'Passkey registration failed' });
        }
        const info = verification.registrationInfo;
        const credentialId = info.credential.id;
        const publicKey = (0, base64url_1.toBase64Url)(info.credential.publicKey);
        const transports = credential.response.transports || null;
        const inserted = await database_1.default.query(`INSERT INTO user_webauthn_credentials
         (user_id, credential_id, public_key, counter, transports, device_type, backed_up, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, created_at, last_used_at`, [
            req.user.id,
            credentialId,
            publicKey,
            info.credential.counter,
            transports,
            info.credentialDeviceType || null,
            typeof info.credentialBackedUp === 'boolean' ? info.credentialBackedUp : null,
            name || null,
        ]);
        await database_1.default.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);
        return res.status(201).json({
            passkey: {
                id: inserted.rows[0].id,
                name: inserted.rows[0].name,
                createdAt: inserted.rows[0].created_at,
                lastUsedAt: inserted.rows[0].last_used_at,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.registrationVerify = registrationVerify;
const loginOptions = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { rpID } = (0, webauthn_1.getWebAuthnConfig)();
        const { email } = req.body;
        const userResult = await database_1.default.query('SELECT id, email, first_name, last_name, role FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'No passkeys registered for this user' });
        }
        const user = userResult.rows[0];
        const credResult = await database_1.default.query('SELECT credential_id, transports FROM user_webauthn_credentials WHERE user_id = $1', [user.id]);
        if (credResult.rows.length === 0) {
            return res.status(404).json({ error: 'No passkeys registered for this user' });
        }
        const options = await (0, server_1.generateAuthenticationOptions)({
            rpID,
            allowCredentials: credResult.rows.map((c) => ({
                id: c.credential_id,
                transports: (c.transports || undefined),
            })),
            userVerification: 'preferred',
        });
        const challengeInsert = await database_1.default.query(`INSERT INTO user_webauthn_challenges (user_id, challenge, type, expires_at)
       VALUES ($1, $2, 'authentication', NOW() + ($3 * INTERVAL '1 millisecond'))
       RETURNING id`, [user.id, options.challenge, CHALLENGE_TTL_MS]);
        return res.json({ challengeId: challengeInsert.rows[0].id, options });
    }
    catch (error) {
        next(error);
    }
};
exports.loginOptions = loginOptions;
const loginVerify = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const { origins, rpID } = (0, webauthn_1.getWebAuthnConfig)();
        const { email, challengeId, credential } = req.body;
        const challengeResult = await database_1.default.query(`SELECT id, user_id, challenge, type, expires_at
       FROM user_webauthn_challenges
       WHERE id = $1`, [challengeId]);
        if (challengeResult.rows.length === 0) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, undefined, clientIp);
            return res.status(400).json({ error: 'Invalid or expired challenge' });
        }
        const challenge = challengeResult.rows[0];
        if (challenge.type !== 'authentication') {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, undefined, clientIp);
            return res.status(400).json({ error: 'Invalid or expired challenge' });
        }
        if (new Date() > new Date(challenge.expires_at)) {
            await database_1.default.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);
            await (0, accountLockout_1.trackLoginAttempt)(email, false, undefined, clientIp);
            return res.status(400).json({ error: 'Invalid or expired challenge' });
        }
        const userResult = await database_1.default.query('SELECT id, email, first_name, last_name, role, profile_picture FROM users WHERE id = $1', [challenge.user_id]);
        if (userResult.rows.length === 0) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, undefined, clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = userResult.rows[0];
        if (user.email.toLowerCase() !== email.toLowerCase()) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, undefined, clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const credentialId = credential.id;
        const credResult = await database_1.default.query(`SELECT *
       FROM user_webauthn_credentials
       WHERE user_id = $1 AND credential_id = $2`, [user.id, credentialId]);
        if (credResult.rows.length === 0) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, user.id, clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const dbCred = credResult.rows[0];
        const expectedCredential = {
            id: dbCred.credential_id,
            publicKey: Uint8Array.from((0, base64url_1.fromBase64Url)(dbCred.public_key)),
            counter: dbCred.counter,
            transports: (dbCred.transports || undefined),
        };
        const verification = await (0, server_1.verifyAuthenticationResponse)({
            response: credential,
            expectedChallenge: challenge.challenge,
            expectedOrigin: origins,
            expectedRPID: rpID,
            credential: expectedCredential,
            requireUserVerification: false,
        });
        if (!verification.verified || !verification.authenticationInfo) {
            await (0, accountLockout_1.trackLoginAttempt)(email, false, user.id, clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        await database_1.default.query(`UPDATE user_webauthn_credentials
       SET counter = $1,
           last_used_at = NOW()
       WHERE id = $2`, [verification.authenticationInfo.newCounter, dbCred.id]);
        await database_1.default.query('DELETE FROM user_webauthn_challenges WHERE id = $1', [challengeId]);
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
exports.loginVerify = loginVerify;
//# sourceMappingURL=passkeyController.js.map