import fs from 'fs';
import { NextFunction, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '@middleware/auth';
import fileStorage from '@services/fileStorageService';
import type {
  CaseFormReviewDecision,
  CreateCaseFormAssignmentDTO,
  CreateCaseFormDefaultDTO,
  SaveCaseFormDraftDTO,
  SendCaseFormAssignmentDTO,
  SubmitCaseFormDTO,
  UpdateCaseFormAssignmentDTO,
  UpdateCaseFormDefaultDTO,
} from '@app-types/caseForms';
import { CaseFormsUseCase } from '../usecases/caseForms.usecase';
import { sendData, sendFailure } from '../mappers/responseMode';

const encodeFileName = (name: string): string => encodeURIComponent(name).replace(/%20/g, ' ');

const getOrganizationId = (req: AuthRequest): string | undefined =>
  req.organizationId || req.accountId || req.tenantId;

const getValidatedQuery = <T extends Record<string, unknown>>(req: AuthRequest): T =>
  ((req.validatedQuery ?? req.query) as T);

const downloadPayloadSchema = z.object({
  fileName: z.string().min(1),
  filePath: z.string().min(1),
  mimeType: z.string().min(1),
});

const streamDownload = async (
  payload: unknown,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const parsed = downloadPayloadSchema.parse(payload);
  const exists = await fileStorage.fileExists(parsed.filePath);
  if (!exists) {
    throw Object.assign(new Error('File not found'), { statusCode: 404, code: 'not_found' });
  }

  const fullPath = fileStorage.getFullPath(parsed.filePath);
  res.setHeader('Content-Type', parsed.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeFileName(parsed.fileName)}"`);

  const stream = fs.createReadStream(fullPath);
  stream.on('error', (error) => next(error));
  stream.pipe(res);
};

export const createCaseFormsController = (useCase: CaseFormsUseCase) => {
  const listDefaults = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const defaults = await useCase.listDefaults(req.params.caseTypeId, getOrganizationId(req));
      sendData(res, defaults);
    } catch (error) {
      next(error);
    }
  };

  const createDefault = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await useCase.createDefault(
        req.params.caseTypeId,
        req.body as CreateCaseFormDefaultDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const updateDefault = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.updateDefault(
        req.params.caseTypeId,
        req.params.defaultId,
        req.body as UpdateCaseFormDefaultDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, updated);
    } catch (error) {
      next(error);
    }
  };

  const listTemplates = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = getValidatedQuery<{
        status?: 'draft' | 'published' | 'archived';
        case_type_id?: string;
      }>(req);
      const templates = await useCase.listTemplates(
        {
          status: query.status,
          caseTypeId: query.case_type_id ?? undefined,
        },
        getOrganizationId(req)
      );
      sendData(res, templates);
    } catch (error) {
      next(error);
    }
  };

  const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await useCase.createTemplate(
        req.body as CreateCaseFormDefaultDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const autosaveTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.autosaveTemplate(
        req.params.defaultId,
        req.body as UpdateCaseFormDefaultDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, updated);
    } catch (error) {
      next(error);
    }
  };

  const saveAssignmentAsTemplate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const created = await useCase.saveAssignmentAsTemplate(
        req.params.id,
        req.params.assignmentId,
        req.body as CreateCaseFormDefaultDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const listRecommendedDefaults = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const defaults = await useCase.listRecommendedDefaults(req.params.id, getOrganizationId(req));
      sendData(res, defaults);
    } catch (error) {
      next(error);
    }
  };

  const createAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await useCase.createAssignment(
        req.params.id,
        req.body as CreateCaseFormAssignmentDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const instantiateDefault = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const created = await useCase.instantiateDefault(
        req.params.id,
        req.params.defaultId,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const getAssignmentDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await useCase.getAssignmentDetailForCase(
        req.params.id,
        req.params.assignmentId,
        getOrganizationId(req)
      );
      sendData(res, detail);
    } catch (error) {
      next(error);
    }
  };

  const updateAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.updateAssignmentForCase(
        req.params.id,
        req.params.assignmentId,
        req.body as UpdateCaseFormAssignmentDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, updated);
    } catch (error) {
      next(error);
    }
  };

  const uploadAsset = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        sendFailure(res, 'VALIDATION_ERROR', 'No file uploaded', 400);
        return;
      }

      const created = await useCase.uploadAssetForCase(
        req.params.id,
        req.params.assignmentId,
        req.body as { question_key: string; asset_kind: 'upload' | 'signature' },
        req.file,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  };

  const saveDraft = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.saveDraftForCase(
        req.params.id,
        req.params.assignmentId,
        req.body as SaveCaseFormDraftDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, updated);
    } catch (error) {
      next(error);
    }
  };

  const submit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await useCase.submitForCase(
        req.params.id,
        req.params.assignmentId,
        req.body as SubmitCaseFormDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, detail, 201);
    } catch (error) {
      next(error);
    }
  };

  const sendAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.sendAssignment(
        req.params.id,
        req.params.assignmentId,
        req.body as SendCaseFormAssignmentDTO,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, updated);
    } catch (error) {
      next(error);
    }
  };

  const reviewAssignment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = await useCase.reviewAssignment(
        req.params.id,
        req.params.assignmentId,
        req.body as CaseFormReviewDecision,
        req.user?.id,
        getOrganizationId(req)
      );
      sendData(res, updated);
    } catch (error) {
      next(error);
    }
  };

  const downloadResponsePacket = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payload = await useCase.getResponsePacketForCase(
        req.params.id,
        req.params.assignmentId,
        getOrganizationId(req)
      );
      await streamDownload(payload, res, next);
    } catch (error) {
      next(error);
    }
  };

  const downloadAsset = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = await useCase.getAssetForCase(
        req.params.id,
        req.params.assignmentId,
        req.params.assetId,
        getOrganizationId(req)
      );
      await streamDownload(payload, res, next);
    } catch (error) {
      next(error);
    }
  };

  const listAssignmentsQuery = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = getValidatedQuery<{ status?: string }>(req);
      const assignments = await useCase.listAssignmentsForCase(req.params.id, getOrganizationId(req));
      const filtered = query.status
        ? assignments.filter((assignment) => assignment.status === query.status)
        : assignments;
      sendData(res, filtered);
    } catch (error) {
      next(error);
    }
  };

  return {
    listDefaults,
    createDefault,
    updateDefault,
    listTemplates,
    createTemplate,
    autosaveTemplate,
    saveAssignmentAsTemplate,
    listRecommendedDefaults,
    listAssignments: listAssignmentsQuery,
    createAssignment,
    instantiateDefault,
    getAssignmentDetail,
    updateAssignment,
    uploadAsset,
    saveDraft,
    submit,
    sendAssignment,
    reviewAssignment,
    downloadResponsePacket,
    downloadAsset,
  };
};
