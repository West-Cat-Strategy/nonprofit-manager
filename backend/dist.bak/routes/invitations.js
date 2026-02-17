"use strict";
/**
 * Invitation Routes
 * Routes for user invitation management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const invitationController_1 = require("../controllers/invitationController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ============================================================================
// PUBLIC ROUTES (for invitation acceptance flow)
// ============================================================================
/**
 * GET /api/invitations/validate/:token
 * Validate an invitation token before showing the registration form
 */
router.get('/validate/:token', [(0, express_validator_1.param)('token').notEmpty().withMessage('Token is required')], invitationController_1.validateInvitation);
/**
 * POST /api/invitations/accept/:token
 * Accept an invitation and create user account
 */
router.post('/accept/:token', [
    (0, express_validator_1.param)('token').notEmpty().withMessage('Token is required'),
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
], invitationController_1.acceptInvitation);
// ============================================================================
// ADMIN ROUTES (require authentication)
// ============================================================================
// All routes below require authentication
router.use(auth_1.authenticate);
/**
 * GET /api/invitations
 * List all invitations
 */
router.get('/', [
    (0, express_validator_1.query)('includeExpired').optional().isBoolean(),
    (0, express_validator_1.query)('includeAccepted').optional().isBoolean(),
    (0, express_validator_1.query)('includeRevoked').optional().isBoolean(),
], invitationController_1.getInvitations);
/**
 * POST /api/invitations
 * Create a new invitation
 */
router.post('/', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('role')
        .notEmpty()
        .isIn(['admin', 'manager', 'user', 'readonly'])
        .withMessage('Valid role is required'),
    (0, express_validator_1.body)('message').optional().isString().trim(),
    (0, express_validator_1.body)('expiresInDays').optional().isInt({ min: 1, max: 30 }).withMessage('Expiry must be 1-30 days'),
], invitationController_1.createInvitation);
/**
 * GET /api/invitations/:id
 * Get invitation by ID
 */
router.get('/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid invitation ID')], invitationController_1.getInvitationById);
/**
 * DELETE /api/invitations/:id
 * Revoke an invitation
 */
router.delete('/:id', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid invitation ID')], invitationController_1.revokeInvitation);
/**
 * POST /api/invitations/:id/resend
 * Resend an invitation with new token
 */
router.post('/:id/resend', [(0, express_validator_1.param)('id').isUUID().withMessage('Invalid invitation ID')], invitationController_1.resendInvitation);
exports.default = router;
//# sourceMappingURL=invitations.js.map