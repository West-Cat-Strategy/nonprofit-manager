import express from 'express';
import { authenticate, authorize } from '@middleware/domains/auth';
import { getBranding, putBranding } from '@controllers/domains/core';
import { getAdminStats, getAuditLogs } from '../controllers/adminStatsController';


const router = express.Router();

router.get('/branding', authenticate, getBranding);
router.put('/branding', authenticate, authorize('admin'), putBranding);

router.get('/stats', authenticate, authorize('admin'), getAdminStats);
router.get('/audit-logs', authenticate, authorize('admin'), getAuditLogs);

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


export default router;

