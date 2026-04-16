import type { NextFunction, Request, Response } from 'express';
import { sendError, sendSuccess } from '@modules/shared/http/envelope';
import {
  AdminRegistrationReviewError,
  confirmAdminRegistrationReview,
  previewAdminRegistrationReview,
} from '@modules/admin/usecases/adminRegistrationReviewUseCase';

const handleReviewError = (
  error: unknown,
  res: Response,
  next: NextFunction
): Response | void => {
  if (error instanceof AdminRegistrationReviewError) {
    return sendError(res, error.code, error.message, error.status);
  }

  return next(error);
};

export const previewAdminRegistrationReviewHandler = async (
  req: Request<{ token: string }>,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const preview = await previewAdminRegistrationReview(req.params.token);
    return sendSuccess(res, preview);
  } catch (error) {
    return handleReviewError(error, res, next);
  }
};

export const confirmAdminRegistrationReviewHandler = async (
  req: Request<{ token: string }>,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const result = await confirmAdminRegistrationReview(req.params.token);
    return sendSuccess(res, result);
  } catch (error) {
    return handleReviewError(error, res, next);
  }
};
