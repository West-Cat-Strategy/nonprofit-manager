import { Router, type Request, type Response } from 'express';
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
  const legacyPathTokenDisabled = (_req: Request, res: Response): void => {
    res.status(410).json({
      success: false,
      error: {
        code: 'legacy_token_path_disabled',
        message:
          'Public case-form path-token access is no longer supported. Use a Bearer token from a fragment-based public link.',
      },
    });
  };

  router.get('/', controller.getForm);
  router.post(
    '/assets',
    publicCaseFormAssetLimiterMiddleware,
    documentUpload.single('file'),
    handleMulterError,
    validateBody(caseFormAssetUploadSchema),
    controller.uploadAsset
  );
  router.post(
    '/draft',
    publicCaseFormDraftLimiterMiddleware,
    validateBody(caseFormDraftSchema),
    controller.saveDraft
  );
  router.post(
    '/submit',
    publicCaseFormSubmitLimiterMiddleware,
    validateBody(caseFormSubmitSchema),
    controller.submit
  );
  router.get('/response-packet', controller.downloadResponsePacket);

  router.get('/:token', validateParams(caseFormTokenParamsSchema), legacyPathTokenDisabled);
  router.post(
    '/:token/assets',
    publicCaseFormAssetLimiterMiddleware,
    validateParams(caseFormTokenParamsSchema),
    legacyPathTokenDisabled
  );
  router.post(
    '/:token/draft',
    publicCaseFormDraftLimiterMiddleware,
    validateParams(caseFormTokenParamsSchema),
    legacyPathTokenDisabled
  );
  router.post(
    '/:token/submit',
    publicCaseFormSubmitLimiterMiddleware,
    validateParams(caseFormTokenParamsSchema),
    legacyPathTokenDisabled
  );
  router.get(
    '/:token/response-packet',
    validateParams(caseFormTokenParamsSchema),
    legacyPathTokenDisabled
  );

  return router;
};

export const publicCaseFormsV2Routes = createPublicCaseFormsRoutes();
