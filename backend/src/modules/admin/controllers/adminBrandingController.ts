import type { Response } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import { badRequest, serverError } from '@utils/responseHelpers';
import { sendSuccess } from '@modules/shared/http/envelope';
import type { BrandingConfig } from '../lib/brandingStore';
import * as adminBrandingUseCase from '../usecases/adminBrandingUseCase';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isValidHexColor = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
};

const parseBrandingConfig = (input: unknown): BrandingConfig | null => {
  if (!isPlainObject(input)) return null;

  const appName = input.appName;
  const appIcon = input.appIcon;
  const primaryColour = input.primaryColour;
  const secondaryColour = input.secondaryColour;
  const favicon = input.favicon;

  if (typeof appName !== 'string' || appName.trim().length === 0) return null;
  if (appIcon !== null && typeof appIcon !== 'string') return null;
  if (!isValidHexColor(primaryColour)) return null;
  if (!isValidHexColor(secondaryColour)) return null;
  if (favicon !== null && typeof favicon !== 'string') return null;

  return {
    appName: appName.trim(),
    appIcon,
    primaryColour,
    secondaryColour,
    favicon,
  };
};

export const getBranding = async (_req: AuthRequest, res: Response) => {
  try {
    return sendSuccess(res, await adminBrandingUseCase.getBranding());
  } catch (error) {
    logger.error('Failed to fetch organization branding', { error });
    return serverError(res, 'Failed to fetch branding');
  }
};

export const putBranding = async (req: AuthRequest, res: Response) => {
  const brandingConfig = parseBrandingConfig(req.body);
  if (!brandingConfig) {
    return badRequest(
      res,
      'Invalid branding payload. Expected { appName, appIcon, primaryColour, secondaryColour, favicon }'
    );
  }

  try {
    logger.info('Organization branding updated', { userId: req.user?.id });
    return sendSuccess(res, await adminBrandingUseCase.updateBranding(brandingConfig));
  } catch (error) {
    logger.error('Failed to update organization branding', { error, userId: req.user?.id });
    return serverError(res, 'Failed to update branding');
  }
};
