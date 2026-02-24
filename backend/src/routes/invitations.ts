/**
 * Invitation Routes
 * Routes for user invitation management
 */

import { Router } from 'express';
import { z } from 'zod';
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
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { emailSchema, uuidSchema } from '@validations/shared';

const router = Router();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number, and special character'
  );

const invitationTokenParamsSchema = z.object({
  token: z.string().trim().min(1, 'Token is required'),
});

const invitationIdParamsSchema = z.object({
  id: uuidSchema,
});

const acceptInvitationSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  password: passwordSchema,
});

const invitationListQuerySchema = z.object({
  includeExpired: z.coerce.boolean().optional(),
  includeAccepted: z.coerce.boolean().optional(),
  includeRevoked: z.coerce.boolean().optional(),
});

const createInvitationSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'manager', 'user', 'readonly']),
  message: z.string().trim().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
  sendEmail: z.coerce.boolean().optional(),
});

// ============================================================================
// PUBLIC ROUTES (for invitation acceptance flow)
// ============================================================================

/**
 * GET /api/invitations/validate/:token
 * Validate an invitation token before showing the registration form
 */
router.get('/validate/:token', validateParams(invitationTokenParamsSchema), validateInvitation);

/**
 * POST /api/invitations/accept/:token
 * Accept an invitation and create user account
 */
router.post('/accept/:token', validateParams(invitationTokenParamsSchema), validateBody(acceptInvitationSchema), acceptInvitation);

// ============================================================================
// ADMIN ROUTES (require authentication)
// ============================================================================

// All routes below require authentication
router.use(authenticate);

/**
 * GET /api/invitations
 * List all invitations
 */
router.get('/', validateQuery(invitationListQuerySchema), getInvitations);

/**
 * POST /api/invitations
 * Create a new invitation
 */
router.post('/', validateBody(createInvitationSchema), createInvitation);

/**
 * GET /api/invitations/:id
 * Get invitation by ID
 */
router.get('/:id', validateParams(invitationIdParamsSchema), getInvitationById);

/**
 * DELETE /api/invitations/:id
 * Revoke an invitation
 */
router.delete('/:id', validateParams(invitationIdParamsSchema), revokeInvitation);

/**
 * POST /api/invitations/:id/resend
 * Resend an invitation with new token
 */
router.post('/:id/resend', validateParams(invitationIdParamsSchema), resendInvitation);

export default router;
