import { Router } from 'express';
import {
  documentUpload,
  handleMulterError,
  publicCaseFormAssetLimiterMiddleware,
  publicCaseFormDraftLimiterMiddleware,
  publicCaseFormSubmitLimiterMiddleware,
} from '@middleware/domains/platform';
import { validateBody, validateParams } from '@middleware/zodValidation';
import {
  caseFormAssetUploadSchema,
  caseFormDraftSchema,
  caseFormSubmitSchema,
  caseFormTokenParamsSchema,
} from '@validations/caseForms';
import { createPublicCaseFormsController } from '../controllers/publicForms.controller';
import { CaseFormsRepository } from '../repositories/caseFormsRepository';
import { CaseFormsUseCase } from '../usecases/caseForms.usecase';

export const createPublicCaseFormsRoutes = (): Router => {
  const router = Router();
  const controller = createPublicCaseFormsController(
    new CaseFormsUseCase(new CaseFormsRepository())
  );

  router.get('/:token', validateParams(caseFormTokenParamsSchema), controller.getForm);
  router.post(
    '/:token/assets',
    publicCaseFormAssetLimiterMiddleware,
    validateParams(caseFormTokenParamsSchema),
    documentUpload.single('file'),
    handleMulterError,
    validateBody(caseFormAssetUploadSchema),
    controller.uploadAsset
  );
  router.post(
    '/:token/draft',
    publicCaseFormDraftLimiterMiddleware,
    validateParams(caseFormTokenParamsSchema),
    validateBody(caseFormDraftSchema),
    controller.saveDraft
  );
  router.post(
    '/:token/submit',
    publicCaseFormSubmitLimiterMiddleware,
    validateParams(caseFormTokenParamsSchema),
    validateBody(caseFormSubmitSchema),
    controller.submit
  );
  router.get(
    '/:token/response-packet',
    validateParams(caseFormTokenParamsSchema),
    controller.downloadResponsePacket
  );

  return router;
};

export const publicCaseFormsV2Routes = createPublicCaseFormsRoutes();
