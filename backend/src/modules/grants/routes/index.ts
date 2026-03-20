import { Router } from 'express';
import { authenticate, authorize } from '@middleware/domains/auth';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import {
  grantApplicationCreateSchema,
  grantApplicationStatusUpdateSchema,
  grantApplicationUpdateSchema,
  grantAwardCreateSchema,
  grantAwardUpdateSchema,
  grantCalendarQuerySchema,
  grantDisbursementCreateSchema,
  grantDisbursementUpdateSchema,
  grantDocumentCreateSchema,
  grantDocumentUpdateSchema,
  grantExportQuerySchema,
  grantFunderCreateSchema,
  grantFunderUpdateSchema,
  grantIdParamsSchema,
  grantListQuerySchema,
  grantProgramCreateSchema,
  grantProgramUpdateSchema,
  grantReportCreateSchema,
  grantReportUpdateSchema,
  grantSummaryQuerySchema,
  fundedProgramCreateSchema,
  fundedProgramUpdateSchema,
  recipientOrganizationCreateSchema,
  recipientOrganizationUpdateSchema,
} from '@validations/grant';
import { createGrantsController } from '../controllers/grants.controller';

export const createGrantsRoutes = (): Router => {
  const router = Router();
  const controller = createGrantsController();

  router.use(authenticate);
  router.use(authorize('admin', 'manager', 'staff'));
  router.use(requireActiveOrganizationContext);

  router.get('/summary', validateQuery(grantSummaryQuerySchema), controller.getSummary);
  router.get('/calendar', validateQuery(grantCalendarQuerySchema), controller.getCalendar);
  router.get('/export', validateQuery(grantExportQuerySchema), controller.exportGrants);

  router.get('/funders', validateQuery(grantListQuerySchema), controller.listFunders);
  router.post('/funders', validateBody(grantFunderCreateSchema), controller.createFunder);
  router.get('/funders/:id', validateParams(grantIdParamsSchema), controller.getFunderById);
  router.put(
    '/funders/:id',
    validateParams(grantIdParamsSchema),
    validateBody(grantFunderUpdateSchema),
    controller.updateFunder
  );
  router.delete('/funders/:id', validateParams(grantIdParamsSchema), controller.deleteFunder);

  router.get('/programs', validateQuery(grantListQuerySchema), controller.listPrograms);
  router.post('/programs', validateBody(grantProgramCreateSchema), controller.createProgram);
  router.get('/programs/:id', validateParams(grantIdParamsSchema), controller.getProgramById);
  router.put(
    '/programs/:id',
    validateParams(grantIdParamsSchema),
    validateBody(grantProgramUpdateSchema),
    controller.updateProgram
  );
  router.delete('/programs/:id', validateParams(grantIdParamsSchema), controller.deleteProgram);

  router.get('/recipients', validateQuery(grantListQuerySchema), controller.listRecipients);
  router.post('/recipients', validateBody(recipientOrganizationCreateSchema), controller.createRecipient);
  router.get('/recipients/:id', validateParams(grantIdParamsSchema), controller.getRecipientById);
  router.put(
    '/recipients/:id',
    validateParams(grantIdParamsSchema),
    validateBody(recipientOrganizationUpdateSchema),
    controller.updateRecipient
  );
  router.delete('/recipients/:id', validateParams(grantIdParamsSchema), controller.deleteRecipient);

  router.get('/funded-programs', validateQuery(grantListQuerySchema), controller.listFundedPrograms);
  router.post(
    '/funded-programs',
    validateBody(fundedProgramCreateSchema),
    controller.createFundedProgram
  );
  router.get(
    '/funded-programs/:id',
    validateParams(grantIdParamsSchema),
    controller.getFundedProgramById
  );
  router.put(
    '/funded-programs/:id',
    validateParams(grantIdParamsSchema),
    validateBody(fundedProgramUpdateSchema),
    controller.updateFundedProgram
  );
  router.delete(
    '/funded-programs/:id',
    validateParams(grantIdParamsSchema),
    controller.deleteFundedProgram
  );

  router.get('/applications', validateQuery(grantListQuerySchema), controller.listApplications);
  router.post('/applications', validateBody(grantApplicationCreateSchema), controller.createApplication);
  router.get('/applications/:id', validateParams(grantIdParamsSchema), controller.getApplicationById);
  router.put(
    '/applications/:id',
    validateParams(grantIdParamsSchema),
    validateBody(grantApplicationUpdateSchema),
    controller.updateApplication
  );
  router.patch(
    '/applications/:id/status',
    validateParams(grantIdParamsSchema),
    validateBody(grantApplicationStatusUpdateSchema),
    controller.updateApplicationStatus
  );
  router.post(
    '/applications/:id/award',
    validateParams(grantIdParamsSchema),
    validateBody(grantAwardCreateSchema),
    controller.awardApplication
  );
  router.delete(
    '/applications/:id',
    validateParams(grantIdParamsSchema),
    controller.deleteApplication
  );

  router.get('/awards', validateQuery(grantListQuerySchema), controller.listGrants);
  router.post('/awards', validateBody(grantAwardCreateSchema), controller.createGrant);
  router.get('/awards/:id', validateParams(grantIdParamsSchema), controller.getGrantById);
  router.put(
    '/awards/:id',
    validateParams(grantIdParamsSchema),
    validateBody(grantAwardUpdateSchema),
    controller.updateGrant
  );
  router.delete('/awards/:id', validateParams(grantIdParamsSchema), controller.deleteGrant);

  router.get('/disbursements', validateQuery(grantListQuerySchema), controller.listDisbursements);
  router.post(
    '/disbursements',
    validateBody(grantDisbursementCreateSchema),
    controller.createDisbursement
  );
  router.get('/disbursements/:id', validateParams(grantIdParamsSchema), controller.getDisbursementById);
  router.put(
    '/disbursements/:id',
    validateParams(grantIdParamsSchema),
    validateBody(grantDisbursementUpdateSchema),
    controller.updateDisbursement
  );
  router.delete(
    '/disbursements/:id',
    validateParams(grantIdParamsSchema),
    controller.deleteDisbursement
  );

  router.get('/reports', validateQuery(grantListQuerySchema), controller.listReports);
  router.post('/reports', validateBody(grantReportCreateSchema), controller.createReport);
  router.get('/reports/:id', validateParams(grantIdParamsSchema), controller.getReportById);
  router.put(
    '/reports/:id',
    validateParams(grantIdParamsSchema),
    validateBody(grantReportUpdateSchema),
    controller.updateReport
  );
  router.delete('/reports/:id', validateParams(grantIdParamsSchema), controller.deleteReport);

  router.get('/documents', validateQuery(grantListQuerySchema), controller.listDocuments);
  router.post('/documents', validateBody(grantDocumentCreateSchema), controller.createDocument);
  router.get('/documents/:id', validateParams(grantIdParamsSchema), controller.getDocumentById);
  router.put(
    '/documents/:id',
    validateParams(grantIdParamsSchema),
    validateBody(grantDocumentUpdateSchema),
    controller.updateDocument
  );
  router.delete('/documents/:id', validateParams(grantIdParamsSchema), controller.deleteDocument);

  router.get('/activities', validateQuery(grantListQuerySchema), controller.listActivities);

  return router;
};

export const grantsV2Routes = createGrantsRoutes();
