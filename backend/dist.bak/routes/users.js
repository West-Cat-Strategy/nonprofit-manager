"use strict";
/**
 * User Management Routes
 * Admin-only routes for managing users
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Get available roles
router.get('/roles', userController_1.getRoles);
// List all users
router.get('/', userController_1.listUsers);
// Get a single user
router.get('/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid user ID')], userController_1.getUser);
// Create a new user
router.post('/', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('role').optional().isIn(['admin', 'manager', 'user', 'readonly']).withMessage('Invalid role'),
], userController_1.createUser);
// Update a user
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    (0, express_validator_1.body)('role').optional().isIn(['admin', 'manager', 'user', 'readonly']).withMessage('Invalid role'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
], userController_1.updateUser);
// Reset user password
router.put('/:id/password', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid user ID'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
], userController_1.resetUserPassword);
// Delete (deactivate) a user
router.delete('/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid user ID')], userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=users.js.map