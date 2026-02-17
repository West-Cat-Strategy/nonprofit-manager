import express from 'express';
import { authenticate } from '@middleware/domains/auth';
import * as caseController from '@controllers/domains/engagement';
import * as documentController from '@controllers/domains/engagement';

const router = express.Router();

// Case management routes
router.get('/summary', authenticate, caseController.getCaseSummary);
router.get('/types', authenticate, caseController.getCaseTypes);
router.get('/statuses', authenticate, caseController.getCaseStatuses);
router.post('/bulk-status', authenticate, caseController.bulkUpdateCaseStatus);
router.post('/', authenticate, caseController.createCase);
router.get('/', authenticate, caseController.getCases);
router.get('/:id', authenticate, caseController.getCaseById);
router.put('/:id', authenticate, caseController.updateCase);
router.delete('/:id', authenticate, caseController.deleteCase);
router.put('/:id/status', authenticate, caseController.updateCaseStatus);
router.put('/:id/reassign', authenticate, caseController.reassignCase);
router.get('/:id/notes', authenticate, caseController.getCaseNotes);
router.get('/:id/documents', authenticate, documentController.getCaseDocuments);
router.get('/:id/milestones', authenticate, caseController.getCaseMilestones);
router.post('/:id/milestones', authenticate, caseController.createCaseMilestone);
router.put('/milestones/:milestoneId', authenticate, caseController.updateCaseMilestone);
router.delete('/milestones/:milestoneId', authenticate, caseController.deleteCaseMilestone);

// Case relationships
router.get('/:id/relationships', authenticate, caseController.getCaseRelationships);
router.post('/:id/relationships', authenticate, caseController.createCaseRelationship);
router.delete('/relationships/:relationshipId', authenticate, caseController.deleteCaseRelationship);

// Case services
router.get('/:id/services', authenticate, caseController.getCaseServices);
router.post('/:id/services', authenticate, caseController.createCaseService);
router.put('/services/:serviceId', authenticate, caseController.updateCaseService);
router.delete('/services/:serviceId', authenticate, caseController.deleteCaseService);

router.post('/notes', authenticate, caseController.createCaseNote);

export default router;
