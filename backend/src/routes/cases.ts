import express from 'express';
import { authenticate } from '../middleware/auth';
import * as caseController from '../controllers/caseController';

const router = express.Router();

// Case management routes
router.get('/summary', authenticate, caseController.getCaseSummary);
router.get('/types', authenticate, caseController.getCaseTypes);
router.get('/statuses', authenticate, caseController.getCaseStatuses);
router.post('/', authenticate, caseController.createCase);
router.get('/', authenticate, caseController.getCases);
router.get('/:id', authenticate, caseController.getCaseById);
router.put('/:id', authenticate, caseController.updateCase);
router.delete('/:id', authenticate, caseController.deleteCase);
router.put('/:id/status', authenticate, caseController.updateCaseStatus);
router.get('/:id/notes', authenticate, caseController.getCaseNotes);
router.post('/notes', authenticate, caseController.createCaseNote);

export default router;
