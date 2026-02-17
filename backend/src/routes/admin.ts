import express from 'express';
import { authenticate, authorize } from '@middleware/domains/auth';
import { getBranding, putBranding } from '@controllers/domains/core';
import { getAdminStats, getAuditLogs } from '../controllers/adminStatsController';


const router = express.Router();

router.get('/branding', authenticate, getBranding);
router.put('/branding', authenticate, authorize('admin'), putBranding);

router.get('/stats', authenticate, authorize('admin'), getAdminStats);
router.get('/audit-logs', authenticate, authorize('admin'), getAuditLogs);


export default router;

