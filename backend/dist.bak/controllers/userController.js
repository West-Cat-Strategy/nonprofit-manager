"use strict";
/**
 * User Management Controller
 * Handles CRUD operations for users (admin only)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoles = exports.deleteUser = exports.resetUserPassword = exports.updateUser = exports.createUser = exports.getUser = exports.listUsers = void 0;
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const constants_1 = require("../config/constants");
const userRoleService_1 = require("../services/userRoleService");
/**
 * GET /api/users
 * List all users (admin only)
 */
const listUsers = async (req, res, next) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { search, role, is_active } = req.query;
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (search) {
            conditions.push(`(
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex} OR
        CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}
      )`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (role) {
            conditions.push(`role = $${paramIndex}`);
            params.push(role);
            paramIndex++;
        }
        if (is_active !== undefined) {
            conditions.push(`is_active = $${paramIndex}`);
            params.push(is_active === 'true');
            paramIndex++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await database_1.default.query(`SELECT id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC`, params);
        const users = result.rows.map((user) => ({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            profilePicture: user.profile_picture || null,
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        }));
        return res.json({ users, total: users.length });
    }
    catch (error) {
        next(error);
    }
};
exports.listUsers = listUsers;
/**
 * GET /api/users/:id
 * Get a single user by ID (admin only)
 */
const getUser = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { id } = req.params;
        const result = await database_1.default.query(`SELECT id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at
       FROM users WHERE id = $1`, [id]);
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
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUser = getUser;
/**
 * POST /api/users
 * Create a new user (admin only)
 */
const createUser = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, firstName, lastName, role = 'user' } = req.body;
        // Check if user already exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        // Create user
        const result = await database_1.default.query(`INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at, created_by)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW(), $6)
       RETURNING id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at`, [email, hashedPassword, firstName, lastName, role, req.user.id]);
        const user = result.rows[0];
        await (0, userRoleService_1.syncUserRole)(user.id, user.role);
        logger_1.logger.info(`User created by admin: ${user.email}`, { adminId: req.user.id });
        return res.status(201).json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            profilePicture: user.profile_picture || null,
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createUser = createUser;
/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
const updateUser = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { email, firstName, lastName, role, isActive } = req.body;
        // Check if user exists
        const existingUser = await database_1.default.query('SELECT id, role FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prevent demoting the last admin
        if (existingUser.rows[0].role === 'admin' && role !== 'admin') {
            const adminCount = await database_1.default.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true");
            if (parseInt(adminCount.rows[0].count) <= 1) {
                return res.status(400).json({ error: 'Cannot demote the last admin user' });
            }
        }
        // Prevent deactivating the last admin
        if (existingUser.rows[0].role === 'admin' && isActive === false) {
            const adminCount = await database_1.default.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true");
            if (parseInt(adminCount.rows[0].count) <= 1) {
                return res.status(400).json({ error: 'Cannot deactivate the last admin user' });
            }
        }
        // Check for email conflict
        if (email) {
            const emailCheck = await database_1.default.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
            if (emailCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Another user with this email already exists' });
            }
        }
        const result = await database_1.default.query(`UPDATE users
       SET email = COALESCE($1, email),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           role = COALESCE($4, role),
           is_active = COALESCE($5, is_active),
           updated_at = NOW(),
           modified_by = $6
       WHERE id = $7
       RETURNING id, email, first_name, last_name, role, profile_picture, is_active, created_at, updated_at`, [email, firstName, lastName, role, isActive, req.user.id, id]);
        const user = result.rows[0];
        if (existingUser.rows[0].role !== user.role) {
            await (0, userRoleService_1.syncUserRole)(user.id, user.role);
        }
        logger_1.logger.info(`User updated by admin: ${user.email}`, { adminId: req.user.id, userId: id });
        return res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            profilePicture: user.profile_picture || null,
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
/**
 * PUT /api/users/:id/password
 * Reset a user's password (admin only)
 */
const resetUserPassword = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { password } = req.body;
        // Check if user exists
        const existingUser = await database_1.default.query('SELECT id, email FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Hash new password
        const hashedPassword = await bcryptjs_1.default.hash(password, constants_1.PASSWORD.BCRYPT_SALT_ROUNDS);
        await database_1.default.query(`UPDATE users
       SET password_hash = $1, updated_at = NOW(), modified_by = $2
       WHERE id = $3`, [hashedPassword, req.user.id, id]);
        logger_1.logger.info(`Password reset by admin for user: ${existingUser.rows[0].email}`, { adminId: req.user.id, userId: id });
        return res.json({ message: 'Password reset successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.resetUserPassword = resetUserPassword;
/**
 * DELETE /api/users/:id
 * Delete a user (admin only) - soft delete by deactivating
 */
const deleteUser = async (req, res, next) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { id } = req.params;
        // Prevent self-deletion
        if (id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        // Check if user exists and their role
        const existingUser = await database_1.default.query('SELECT id, role, email FROM users WHERE id = $1', [id]);
        if (existingUser.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prevent deleting the last admin
        if (existingUser.rows[0].role === 'admin') {
            const adminCount = await database_1.default.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true");
            if (parseInt(adminCount.rows[0].count) <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin user' });
            }
        }
        // Soft delete - just deactivate the user
        await database_1.default.query(`UPDATE users
       SET is_active = false, updated_at = NOW(), modified_by = $1
       WHERE id = $2`, [req.user.id, id]);
        logger_1.logger.info(`User deactivated by admin: ${existingUser.rows[0].email}`, { adminId: req.user.id, userId: id });
        return res.json({ message: 'User deactivated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
/**
 * GET /api/users/roles
 * Get available user roles
 */
const getRoles = async (req, res, _next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const roles = [
        { value: 'admin', label: 'Administrator', description: 'Full access to all features and settings' },
        { value: 'manager', label: 'Manager', description: 'Can manage records but not system settings' },
        { value: 'user', label: 'User', description: 'Standard access to view and edit records' },
        { value: 'readonly', label: 'Read Only', description: 'Can only view records, no editing' },
    ];
    return res.json({ roles });
};
exports.getRoles = getRoles;
//# sourceMappingURL=userController.js.map