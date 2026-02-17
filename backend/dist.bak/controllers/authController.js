"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateProfile = exports.getProfile = exports.updatePreferenceKey = exports.updatePreferences = exports.getPreferences = exports.setupFirstUser = exports.checkSetupStatus = exports.getCurrentUser = exports.login = exports.register = void 0;
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const jwt_1 = require("../config/jwt");
const accountLockout_1 = require("../middleware/accountLockout");
const constants_1 = require("../config/constants");
const userRoleService_1 = require("../services/userRoleService");
const mfaController_1 = require("./mfaController");
const getDefaultOrganizationId = async () => {
    const result = await database_1.default.query(`SELECT id
     FROM accounts
     WHERE account_type = 'organization'
     ORDER BY created_at ASC
     LIMIT 1`);
    return result.rows[0]?.id || null;
};
const register = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, firstName, lastName } = req.body;
        const role = 'user';
        // Check if user exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        // Create user
        const result = await database_1.default.query(`INSERT INTO users (email, password_hash, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, created_at`, [email, hashedPassword, firstName, lastName, role]);
        const user = result.rows[0];
        await (0, userRoleService_1.syncUserRole)(user.id, user.role);
        // Generate JWT token for immediate login after registration
        const jwtSecret = (0, jwt_1.getJwtSecret)();
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        }, jwtSecret, { expiresIn: constants_1.JWT.ACCESS_TOKEN_EXPIRY });
        logger_1.logger.info(`User registered: ${user.email}`);
        const organizationId = await getDefaultOrganizationId();
        return res.status(201).json({
            token,
            organizationId,
            user: {
                user_id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                profilePicture: null,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        // Get user
        const result = await database_1.default.query('SELECT id, email, password_hash, first_name, last_name, role, profile_picture, mfa_totp_enabled FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            // Track failed attempt for non-existent user
            await (0, accountLockout_1.trackLoginAttempt)(email, false, undefined, clientIp);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        await (0, userRoleService_1.syncUserRole)(user.id, user.role);
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            // Track failed login attempt
            await (0, accountLockout_1.trackLoginAttempt)(email, false, user.id, clientIp);
            logger_1.logger.warn(`Failed login attempt for user: ${email}`, { ip: clientIp });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // If TOTP is enabled, require second factor before issuing tokens
        if (user.mfa_totp_enabled) {
            logger_1.logger.info(`MFA required for user: ${user.email}`, { ip: clientIp });
            const organizationId = await getDefaultOrganizationId();
            return res.json({
                ...(0, mfaController_1.issueTotpMfaChallenge)(user),
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
        // Track successful login (no MFA required)
        await (0, accountLockout_1.trackLoginAttempt)(email, true, user.id, clientIp);
        // Generate access token
        const jwtSecret = (0, jwt_1.getJwtSecret)();
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        }, jwtSecret, { expiresIn: constants_1.JWT.ACCESS_TOKEN_EXPIRY });
        // Generate refresh token (for future use)
        const refreshToken = jsonwebtoken_1.default.sign({
            id: user.id,
            type: 'refresh',
        }, jwtSecret, { expiresIn: '7d' });
        logger_1.logger.info(`User logged in: ${user.email}`, { ip: clientIp });
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
exports.login = login;
const getCurrentUser = async (req, res, next) => {
    try {
        const result = await database_1.default.query('SELECT id, email, first_name, last_name, role, profile_picture, created_at FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        return res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            profilePicture: user.profile_picture || null,
            createdAt: user.created_at,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCurrentUser = getCurrentUser;
/**
 * GET /api/auth/setup-status
 * Check if initial setup is required (no users exist)
 */
const checkSetupStatus = async (_req, res, next) => {
    try {
        // Check if any admin users exist
        const adminResult = await database_1.default.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        const adminCount = parseInt(adminResult.rows[0].count);
        // Also get total user count for reference
        const totalResult = await database_1.default.query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(totalResult.rows[0].count);
        return res.json({
            setupRequired: adminCount === 0,
            userCount: userCount,
        });
    }
    catch (error) {
        logger_1.logger.error('Error checking setup status', error);
        next(error);
    }
};
exports.checkSetupStatus = checkSetupStatus;
/**
 * POST /api/auth/setup
 * Create the first admin user (only works if no users exist)
 */
const setupFirstUser = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // Check if any admin users exist
        const countResult = await database_1.default.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
        const adminCount = parseInt(countResult.rows[0].count);
        if (adminCount > 0) {
            return res.status(403).json({
                error: 'Setup has already been completed. An admin user already exists.'
            });
        }
        const { email, password, firstName, lastName } = req.body;
        // Hash password
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        // Create first user as admin
        const result = await database_1.default.query(`INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, role, created_at`, [email, passwordHash, firstName, lastName, 'admin']);
        const user = result.rows[0];
        const defaultOrgName = process.env.ORG_DEFAULT_NAME || 'Default Organization';
        const orgResult = await database_1.default.query(`INSERT INTO accounts (account_name, account_type, created_by, modified_by)
       VALUES ($1, 'organization', $2, $2)
       RETURNING id`, [defaultOrgName, user.id]);
        const organizationId = orgResult.rows[0]?.id || null;
        // Generate access token
        const jwtSecret = (0, jwt_1.getJwtSecret)();
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        }, jwtSecret, { expiresIn: constants_1.JWT.ACCESS_TOKEN_EXPIRY });
        logger_1.logger.info(`First admin user created: ${email}`);
        return res.status(201).json({
            message: 'Setup completed successfully',
            token,
            organizationId,
            user: {
                user_id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                profilePicture: null,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error during first-time setup', error);
        next(error);
    }
};
exports.setupFirstUser = setupFirstUser;
/**
 * GET /api/auth/preferences
 * Get user preferences
 */
const getPreferences = async (req, res, next) => {
    try {
        const result = await database_1.default.query('SELECT preferences FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({
            preferences: result.rows[0].preferences || {},
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPreferences = getPreferences;
/**
 * PUT /api/auth/preferences
 * Update user preferences (merge with existing)
 */
const updatePreferences = async (req, res, next) => {
    try {
        const { preferences } = req.body;
        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ error: 'Preferences must be an object' });
        }
        // Use jsonb_set to merge preferences rather than replace
        const result = await database_1.default.query(`UPDATE users
       SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING preferences`, [JSON.stringify(preferences), req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        logger_1.logger.info(`User preferences updated: ${req.user.id}`);
        return res.json({
            preferences: result.rows[0].preferences,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePreferences = updatePreferences;
/**
 * PATCH /api/auth/preferences/:key
 * Update a specific preference key
 */
const updatePreferenceKey = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }
        // Update specific key in preferences
        const result = await database_1.default.query(`UPDATE users
       SET preferences = COALESCE(preferences, '{}'::jsonb) || jsonb_build_object($1::text, $2::jsonb),
           updated_at = NOW()
       WHERE id = $3
       RETURNING preferences`, [key, JSON.stringify(value), req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        logger_1.logger.info(`User preference '${key}' updated: ${req.user.id}`);
        return res.json({
            preferences: result.rows[0].preferences,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePreferenceKey = updatePreferenceKey;
/**
 * GET /api/auth/profile
 * Get full user profile including extended fields
 */
const getProfile = async (req, res, next) => {
    try {
        const result = await database_1.default.query(`SELECT id, email, first_name, last_name, role,
              display_name, alternative_name, pronouns, title,
              cell_phone, contact_number, profile_picture,
              email_shared_with_clients, email_shared_with_users,
              alternative_emails, notifications
       FROM users WHERE id = $1`, [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        const defaultNotifications = {
            emailNotifications: true,
            taskReminders: true,
            eventReminders: true,
            donationAlerts: true,
            caseUpdates: true,
            weeklyDigest: false,
            marketingEmails: false,
        };
        return res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            displayName: user.display_name || '',
            alternativeName: user.alternative_name || '',
            pronouns: user.pronouns || '',
            title: user.title || '',
            cellPhone: user.cell_phone || '',
            contactNumber: user.contact_number || '',
            profilePicture: user.profile_picture || null,
            emailSharedWithClients: user.email_shared_with_clients || false,
            emailSharedWithUsers: user.email_shared_with_users || false,
            alternativeEmails: user.alternative_emails || [],
            notifications: user.notifications || defaultNotifications,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
/**
 * PUT /api/auth/profile
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { firstName, lastName, email, displayName, alternativeName, pronouns, title, cellPhone, contactNumber, profilePicture, emailSharedWithClients, emailSharedWithUsers, alternativeEmails, notifications, } = req.body;
        // Check if email is being changed and if it's already taken
        if (email) {
            const emailCheck = await database_1.default.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Email is already in use by another account' });
            }
        }
        const result = await database_1.default.query(`UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           display_name = $4,
           alternative_name = $5,
           pronouns = $6,
           title = $7,
           cell_phone = $8,
           contact_number = $9,
           profile_picture = $10,
           email_shared_with_clients = COALESCE($11, email_shared_with_clients),
           email_shared_with_users = COALESCE($12, email_shared_with_users),
           alternative_emails = COALESCE($13, alternative_emails),
           notifications = COALESCE($14, notifications),
           updated_at = NOW()
       WHERE id = $15
       RETURNING id, email, first_name, last_name, role,
                 display_name, alternative_name, pronouns, title,
                 cell_phone, contact_number, profile_picture,
                 email_shared_with_clients, email_shared_with_users,
                 alternative_emails, notifications`, [
            firstName,
            lastName,
            email,
            displayName || null,
            alternativeName || null,
            pronouns || null,
            title || null,
            cellPhone || null,
            contactNumber || null,
            profilePicture || null,
            emailSharedWithClients,
            emailSharedWithUsers,
            alternativeEmails ? JSON.stringify(alternativeEmails) : null,
            notifications ? JSON.stringify(notifications) : null,
            req.user.id,
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        const defaultNotifications = {
            emailNotifications: true,
            taskReminders: true,
            eventReminders: true,
            donationAlerts: true,
            caseUpdates: true,
            weeklyDigest: false,
            marketingEmails: false,
        };
        logger_1.logger.info(`User profile updated: ${user.email}`);
        return res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            displayName: user.display_name || '',
            alternativeName: user.alternative_name || '',
            pronouns: user.pronouns || '',
            title: user.title || '',
            cellPhone: user.cell_phone || '',
            contactNumber: user.contact_number || '',
            profilePicture: user.profile_picture || null,
            emailSharedWithClients: user.email_shared_with_clients || false,
            emailSharedWithUsers: user.email_shared_with_users || false,
            alternativeEmails: user.alternative_emails || [],
            notifications: user.notifications || defaultNotifications,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
/**
 * PUT /api/auth/password
 * Change user password
 */
const changePassword = async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { currentPassword, newPassword } = req.body;
        // Get current password hash
        const userResult = await database_1.default.query('SELECT password_hash, email FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        // Update password
        await database_1.default.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hashedPassword, req.user.id]);
        logger_1.logger.info(`Password changed for user: ${user.email}`);
        return res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=authController.js.map