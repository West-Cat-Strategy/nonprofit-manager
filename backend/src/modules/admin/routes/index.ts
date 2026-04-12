import express from 'express';
import { authenticate, authorize } from '@middleware/domains/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
<<<<<<< HEAD
  createRoleHandler,
  deleteRoleHandler,
  getBranding,
  listPermissions,
  listRoles,
=======
  getBranding,
>>>>>>> origin/main
  putBranding,
  getEmailSettings,
  getOrganizationSettingsHandler,
  updateEmailSettings,
  updateOrganizationSettingsHandler,
  testEmailSettings,
  getTwilioSettings,
  updateTwilioSettings,
  testTwilioSettings,
} from '../controllers';
import {
  getRegistrationSettingsHandler,
  updateRegistrationSettingsHandler,
  listPendingRegistrationsHandler,
  approvePendingRegistrationHandler,
  rejectPendingRegistrationHandler,
} from '../controllers';
<<<<<<< HEAD
import { getAdminStats, getAuditLogs, getUserAuditLogs } from '../controllers/adminStatsController';
import * as outcomeDefinitionController from '../controllers/outcomeDefinitionController';
import { updateRoleHandler } from '../controllers/roleCatalogController';
=======
import { getAdminStats, getAuditLogs } from '../controllers/adminStatsController';
import * as outcomeDefinitionController from '../controllers/outcomeDefinitionController';
>>>>>>> origin/main
import {
  createOutcomeDefinitionSchema,
  listOutcomeDefinitionsQuerySchema,
  outcomeDefinitionIdParamsSchema,
  reorderOutcomeDefinitionsSchema,
  updateOutcomeDefinitionSchema,
} from '@validations/outcomeDefinition';
import {
  adminAuditLogsQuerySchema,
  adminPendingRegistrationsQuerySchema,
  adminPendingRegistrationParamsSchema,
  updateOrganizationSettingsSchema,
  rejectPendingRegistrationSchema,
  updateEmailSettingsSchema,
<<<<<<< HEAD
  adminRoleCreateSchema,
  adminRoleParamsSchema,
  adminRoleUpdateSchema,
  adminUserAuditLogsParamsSchema,
  updateRegistrationSettingsSchema,
  updateTwilioSettingsSchema,
} from '@validations/admin';
=======
  updateRegistrationSettingsSchema,
  updateTwilioSettingsSchema,
} from '@validations/admin';
import { sendSuccess } from '@modules/shared/http/envelope';


>>>>>>> origin/main
const router = express.Router();

router.get('/branding', authenticate, getBranding);
router.put('/branding', authenticate, authorize('admin'), putBranding);
router.get('/organization-settings', authenticate, authorize('admin'), getOrganizationSettingsHandler);
router.put(
  '/organization-settings',
  authenticate,
  authorize('admin'),
  validateBody(updateOrganizationSettingsSchema),
  updateOrganizationSettingsHandler
);

router.get('/stats', authenticate, authorize('admin'), getAdminStats);
router.get(
  '/audit-logs',
  authenticate,
  authorize('admin'),
  validateQuery(adminAuditLogsQuerySchema),
  getAuditLogs
);
<<<<<<< HEAD
router.get(
  '/users/:id/audit-logs',
  authenticate,
  authorize('admin'),
  validateParams(adminUserAuditLogsParamsSchema),
  validateQuery(adminAuditLogsQuerySchema),
  getUserAuditLogs
);
=======
>>>>>>> origin/main

// Email settings (admin only)
router.get('/email-settings', authenticate, authorize('admin'), getEmailSettings);
router.put(
  '/email-settings',
  authenticate,
  authorize('admin'),
  validateBody(updateEmailSettingsSchema),
  updateEmailSettings
);
router.post('/email-settings/test', authenticate, authorize('admin'), testEmailSettings);

// Twilio settings (admin only)
router.get('/twilio-settings', authenticate, authorize('admin'), getTwilioSettings);
router.put(
  '/twilio-settings',
  authenticate,
  authorize('admin'),
  validateBody(updateTwilioSettingsSchema),
  updateTwilioSettings
);
router.post('/twilio-settings/test', authenticate, authorize('admin'), testTwilioSettings);

<<<<<<< HEAD
// Role and permission catalog
router.get('/roles', authenticate, authorize('admin'), listRoles);
router.get('/permissions', authenticate, authorize('admin'), listPermissions);
router.post(
  '/roles',
  authenticate,
  authorize('admin'),
  validateBody(adminRoleCreateSchema),
  createRoleHandler
);
router.put(
  '/roles/:id',
  authenticate,
  authorize('admin'),
  validateParams(adminRoleParamsSchema),
  validateBody(adminRoleUpdateSchema),
  updateRoleHandler
);
router.delete(
  '/roles/:id',
  authenticate,
  authorize('admin'),
  validateParams(adminRoleParamsSchema),
  deleteRoleHandler
);
=======
// Roles endpoint - returns hardcoded role definitions
router.get('/roles', authenticate, authorize('admin'), (_req, res) => {
  sendSuccess(res, {
    roles: [
      { id: 'admin', name: 'Administrator', description: 'Full system access', permissions: ['*'] },
      { id: 'manager', name: 'Manager', description: 'Manage users, contacts, and programs', permissions: ['manage_users', 'manage_contacts', 'manage_programs'] },
      { id: 'user', name: 'User', description: 'Standard access to assigned areas', permissions: ['view_contacts', 'edit_contacts', 'view_programs'] },
      { id: 'readonly', name: 'Read Only', description: 'View-only access', permissions: ['view_contacts', 'view_programs'] },
    ],
  });
});
>>>>>>> origin/main

// Registration settings (admin only)
router.get('/registration-settings', authenticate, authorize('admin'), getRegistrationSettingsHandler);
router.put(
  '/registration-settings',
  authenticate,
  authorize('admin'),
  validateBody(updateRegistrationSettingsSchema),
  updateRegistrationSettingsHandler
);

// Pending registrations (admin only)
router.get(
  '/pending-registrations',
  authenticate,
  authorize('admin'),
  validateQuery(adminPendingRegistrationsQuerySchema),
  listPendingRegistrationsHandler
);
router.post(
  '/pending-registrations/:id/approve',
  authenticate,
  authorize('admin'),
  validateParams(adminPendingRegistrationParamsSchema),
  approvePendingRegistrationHandler
);
router.post(
  '/pending-registrations/:id/reject',
  authenticate,
  authorize('admin'),
  validateParams(adminPendingRegistrationParamsSchema),
  validateBody(rejectPendingRegistrationSchema),
  rejectPendingRegistrationHandler
);

// Outcome definitions (permission guarded at controller level)
router.get(
  '/outcomes',
  authenticate,
  validateQuery(listOutcomeDefinitionsQuerySchema),
  outcomeDefinitionController.listOutcomeDefinitions
);
router.post(
  '/outcomes',
  authenticate,
  validateBody(createOutcomeDefinitionSchema),
  outcomeDefinitionController.createOutcomeDefinition
);
router.patch(
  '/outcomes/:id',
  authenticate,
  validateParams(outcomeDefinitionIdParamsSchema),
  validateBody(updateOutcomeDefinitionSchema),
  outcomeDefinitionController.updateOutcomeDefinition
);
router.post(
  '/outcomes/:id/enable',
  authenticate,
  validateParams(outcomeDefinitionIdParamsSchema),
  outcomeDefinitionController.enableOutcomeDefinition
);
router.post(
  '/outcomes/:id/disable',
  authenticate,
  validateParams(outcomeDefinitionIdParamsSchema),
  outcomeDefinitionController.disableOutcomeDefinition
);
router.post(
  '/outcomes/reorder',
  authenticate,
  validateBody(reorderOutcomeDefinitionsSchema),
  outcomeDefinitionController.reorderOutcomeDefinitions
);


export default router;

export type ResponseMode = 'v2' | 'legacy';

export const createAdminRoutes = (_mode: ResponseMode = 'v2') => router;

export const adminV2Routes = createAdminRoutes('v2');
