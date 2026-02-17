import express from 'express';
import { authenticate, authorize } from '@middleware/domains/auth';
import { getBranding, putBranding, getEmailSettings, updateEmailSettings, testEmailSettings } from '@controllers/domains/core';
import {
  getRegistrationSettingsHandler,
  updateRegistrationSettingsHandler,
  listPendingRegistrationsHandler,
  approvePendingRegistrationHandler,
  rejectPendingRegistrationHandler,
} from '@controllers/domains/core';
import { getAdminStats, getAuditLogs } from '../controllers/adminStatsController';


const router = express.Router();

router.get('/branding', authenticate, getBranding);
router.put('/branding', authenticate, authorize('admin'), putBranding);

router.get('/stats', authenticate, authorize('admin'), getAdminStats);
router.get('/audit-logs', authenticate, authorize('admin'), getAuditLogs);

// Email settings (admin only)
router.get('/email-settings', authenticate, authorize('admin'), getEmailSettings);
router.put('/email-settings', authenticate, authorize('admin'), updateEmailSettings);
router.post('/email-settings/test', authenticate, authorize('admin'), testEmailSettings);

// Roles endpoint - returns hardcoded role definitions
router.get('/roles', authenticate, authorize('admin'), (_req, res) => {
  res.json({
    roles: [
      { id: 'admin', name: 'Administrator', description: 'Full system access', permissions: ['*'] },
      { id: 'manager', name: 'Manager', description: 'Manage users, contacts, and programs', permissions: ['manage_users', 'manage_contacts', 'manage_programs'] },
      { id: 'user', name: 'User', description: 'Standard access to assigned areas', permissions: ['view_contacts', 'edit_contacts', 'view_programs'] },
      { id: 'readonly', name: 'Read Only', description: 'View-only access', permissions: ['view_contacts', 'view_programs'] },
    ],
  });
});

// Registration settings (admin only)
router.get('/registration-settings', authenticate, authorize('admin'), getRegistrationSettingsHandler);
router.put('/registration-settings', authenticate, authorize('admin'), updateRegistrationSettingsHandler);

// Pending registrations (admin only)
router.get('/pending-registrations', authenticate, authorize('admin'), listPendingRegistrationsHandler);
router.post('/pending-registrations/:id/approve', authenticate, authorize('admin'), approvePendingRegistrationHandler);
router.post('/pending-registrations/:id/reject', authenticate, authorize('admin'), rejectPendingRegistrationHandler);


export default router;

