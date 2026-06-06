import type { NextFunction, Request, Response } from 'express';
import { sendError } from '@modules/shared/http/envelope';

export const requireJsonRequest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.is('application/json')) {
    next();
    return;
  }

  sendError(
    res,
    'unsupported_media_type',
    'Content-Type must be application/json',
    415
  );
};
