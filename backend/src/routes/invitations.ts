/**
 * Invitation Routes
 * Routes for user invitation management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createInvitation,
  getInvitations,
  getInvitationById,
  validateInvitation,
  acceptInvitation,
  revokeInvitation,
  resendInvitation,
} from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { validateRequest } from '@middleware/domains/security';

const router = Router();

// ============================================================================
// PUBLIC ROUTES (for invitation acceptance flow)
// ============================================================================

/**
 * GET /api/invitations/validate/:token
 * Validate an invitation token before showing the registration form
 */
router.get(
  '/validate/:token',
  [param('token').notEmpty().withMessage('Token is required'), validateRequest],
  validateInvitation
);

/**
 * POST /api/invitations/accept/:token
 * Accept an invitation and create user account
 */
router.post(
  '/accept/:token',
  [
    param('token').notEmpty().withMessage('Token is required'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    validateRequest,
  ],
  acceptInvitation
);

// ============================================================================
// ADMIN ROUTES (require authentication)
// ============================================================================

// All routes below require authentication
router.use(authenticate);

/**
 * GET /api/invitations
 * List all invitations
 */
router.get(
  '/',
  [
    query('includeExpired').optional().isBoolean(),
    query('includeAccepted').optional().isBoolean(),
    query('includeRevoked').optional().isBoolean(),
    validateRequest,
  ],
  getInvitations
);

/**
 * POST /api/invitations
 * Create a new invitation
 */
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role')
      .notEmpty()
      .isIn(['admin', 'manager', 'user', 'readonly'])
      .withMessage('Valid role is required'),
    body('message').optional().isString().trim(),
    body('expiresInDays').optional().isInt({ min: 1, max: 30 }).withMessage('Expiry must be 1-30 days'),
    validateRequest,
  ],
  createInvitation
);

/**
 * GET /api/invitations/:id
 * Get invitation by ID
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid invitation ID'), validateRequest],
  getInvitationById
);

/**
 * DELETE /api/invitations/:id
 * Revoke an invitation
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid invitation ID'), validateRequest],
  revokeInvitation
);

/**
 * POST /api/invitations/:id/resend
 * Resend an invitation with new token
 */
router.post(
  '/:id/resend',
  [param('id').isUUID().withMessage('Invalid invitation ID'), validateRequest],
  resendInvitation
);

export default router;
