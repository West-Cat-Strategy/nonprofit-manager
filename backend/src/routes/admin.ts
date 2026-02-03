import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getBranding, putBranding } from '../controllers/adminBrandingController';

const router = express.Router();

router.get('/branding', authenticate, getBranding);
router.put('/branding', authenticate, authorize('admin'), putBranding);

export default router;

