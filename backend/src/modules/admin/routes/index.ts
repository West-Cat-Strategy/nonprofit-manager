import express from 'express';
import { authenticate } from '@middleware/domains/auth';
import { requirePermission } from '@middleware/permissions';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  approvePendingRegistrationHandler,
  createPolicyGroupHandler,
  createRoleHandler,
  deletePolicyGroupHandler,
  deleteRoleHandler,
    getBranding,
    getEmailSettings,
    getOrganizationSettingsHandler,
    getRegistrationSettingsHandler,
    getTwilioSettings,
    getUserAccessHandler,
  listOrganizationAccountsHandler,
  listPendingRegistrationsHandler,
  listPermissions,
  listPolicyGroupsHandler,
  listRoles,
  putBranding,
  rejectPendingRegistrationHandler,
  testEmailSettings,
  testTwilioSettings,
  updateEmailSettings,
  updateOrganizationSettingsHandler,
  updatePolicyGroupHandler,
  updateRegistrationSettingsHandler,
  updateRoleHandler,
  updateTwilioSettings,
  updateUserAccessHandler,
} from '../controllers';
import { getAdminStats, getAuditLogs, getUserAuditLogs } from '../controllers/adminStatsController';
import * as outcomeDefinitionController from '../controllers/outcomeDefinitionController';
import {
  adminAuditLogsQuerySchema,
  adminPendingRegistrationsQuerySchema,
  adminPendingRegistrationParamsSchema,
  adminPolicyGroupCreateSchema,
  adminPolicyGroupParamsSchema,
  adminPolicyGroupUpdateSchema,
  adminRoleCreateSchema,
  adminRoleParamsSchema,
  adminRoleUpdateSchema,
  adminUserAccessBodySchema,
  adminUserAccessParamsSchema,
  adminUserAuditLogsParamsSchema,
  rejectPendingRegistrationSchema,
  updateEmailSettingsSchema,
  updateOrganizationSettingsSchema,
  updateRegistrationSettingsSchema,
  updateTwilioSettingsSchema,
} from '@validations/admin';
import {
  createOutcomeDefinitionSchema,
  listOutcomeDefinitionsQuerySchema,
  outcomeDefinitionIdParamsSchema,
  reorderOutcomeDefinitionsSchema,
  updateOutcomeDefinitionSchema,
} from '@validations/outcomeDefinition';
import { Permission } from '@utils/permissions';

const router = express.Router();

router.get('/branding', authenticate, requirePermission(Permission.ADMIN_BRANDING), getBranding);
router.put('/branding', authenticate, requirePermission(Permission.ADMIN_BRANDING), putBranding);

router.get(
  '/organization-settings',
  authenticate,
  requirePermission(Permission.ADMIN_ORGANIZATION),
  getOrganizationSettingsHandler
);
router.put(
  '/organization-settings',
  authenticate,
  requirePermission(Permission.ADMIN_ORGANIZATION),
  validateBody(updateOrganizationSettingsSchema),
  updateOrganizationSettingsHandler
);

router.get('/stats', authenticate, requirePermission(Permission.ADMIN_AUDIT), getAdminStats);
router.get(
  '/audit-logs',
  authenticate,
  requirePermission(Permission.ADMIN_AUDIT),
  validateQuery(adminAuditLogsQuerySchema),
  getAuditLogs
);
router.get(
  '/users/:id/audit-logs',
  authenticate,
  requirePermission(Permission.ADMIN_AUDIT),
  validateParams(adminUserAuditLogsParamsSchema),
  validateQuery(adminAuditLogsQuerySchema),
  getUserAuditLogs
);

router.get(
  '/email-settings',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  getEmailSettings
);
router.put(
  '/email-settings',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  validateBody(updateEmailSettingsSchema),
  updateEmailSettings
);
router.post(
  '/email-settings/test',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  testEmailSettings
);

router.get(
  '/twilio-settings',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  getTwilioSettings
);
router.put(
  '/twilio-settings',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  validateBody(updateTwilioSettingsSchema),
  updateTwilioSettings
);
router.post(
  '/twilio-settings/test',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  testTwilioSettings
);

router.get('/roles', authenticate, requirePermission(Permission.ADMIN_USERS), listRoles);
router.get('/permissions', authenticate, requirePermission(Permission.ADMIN_USERS), listPermissions);
router.post(
  '/roles',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateBody(adminRoleCreateSchema),
  createRoleHandler
);
router.put(
  '/roles/:id',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminRoleParamsSchema),
  validateBody(adminRoleUpdateSchema),
  updateRoleHandler
);
router.delete(
  '/roles/:id',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminRoleParamsSchema),
  deleteRoleHandler
);

router.get('/groups', authenticate, requirePermission(Permission.ADMIN_USERS), listPolicyGroupsHandler);
router.post(
  '/groups',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateBody(adminPolicyGroupCreateSchema),
  createPolicyGroupHandler
);
router.put(
  '/groups/:id',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminPolicyGroupParamsSchema),
  validateBody(adminPolicyGroupUpdateSchema),
  updatePolicyGroupHandler
);
router.delete(
  '/groups/:id',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminPolicyGroupParamsSchema),
  deletePolicyGroupHandler
);

router.get(
  '/users/:id/access',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminUserAccessParamsSchema),
  getUserAccessHandler
);
router.put(
  '/users/:id/access',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminUserAccessParamsSchema),
  validateBody(adminUserAccessBodySchema),
  updateUserAccessHandler
);
router.get(
  '/organization-accounts',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  listOrganizationAccountsHandler
);

router.get(
  '/registration-settings',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  getRegistrationSettingsHandler
);
router.put(
  '/registration-settings',
  authenticate,
  requirePermission(Permission.ADMIN_SETTINGS),
  validateBody(updateRegistrationSettingsSchema),
  updateRegistrationSettingsHandler
);

router.get(
  '/pending-registrations',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateQuery(adminPendingRegistrationsQuerySchema),
  listPendingRegistrationsHandler
);
router.post(
  '/pending-registrations/:id/approve',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminPendingRegistrationParamsSchema),
  approvePendingRegistrationHandler
);
router.post(
  '/pending-registrations/:id/reject',
  authenticate,
  requirePermission(Permission.ADMIN_USERS),
  validateParams(adminPendingRegistrationParamsSchema),
  validateBody(rejectPendingRegistrationSchema),
  rejectPendingRegistrationHandler
);

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
