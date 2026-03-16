import type { NextFunction, Response } from 'express';
import { logger } from '@config/logger';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { serverError } from '@utils/responseHelpers';
import { getOrganizationBrandingConfig } from '@modules/admin/lib/brandingStore';
import { findOrganizationSettings } from '@modules/admin/lib/organizationSettingsStore';
import {
  getCurrentAuthUserById,
  getUserPreferences,
  requireAuthenticatedUser,
} from '../lib/authQueries';
import { resolveAuthenticatedOrganizationId } from '../lib/resolveOrganizationContext';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const pickStartupPreferences = (
  preferences: Record<string, unknown> | null,
  organizationTimezone?: string | null
): Record<string, unknown> => {
  if (!preferences) {
    return organizationTimezone ? { timezone: organizationTimezone } : {};
  }

  const organization = isPlainObject(preferences.organization) ? preferences.organization : null;
  const timezone =
    readTrimmedString(organization?.timezone) ??
    readTrimmedString(preferences.timezone) ??
    readTrimmedString(organizationTimezone);

  const startupPreferences: Record<string, unknown> = {};

  if (timezone) {
    startupPreferences.timezone = timezone;
  }

  if (isPlainObject(preferences.navigation)) {
    startupPreferences.navigation = preferences.navigation;
  }

  if (isPlainObject(preferences.dashboard_settings)) {
    startupPreferences.dashboard_settings = preferences.dashboard_settings;
  }

  return startupPreferences;
};

export const getBootstrap = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authUser = requireAuthenticatedUser(req, res);
    if (!authUser) {
      return;
    }

    const [user, preferences] = await Promise.all([
      getCurrentAuthUserById(authUser.id),
      getUserPreferences(authUser.id),
    ]);

    if (!user) {
      return serverError(res, 'Failed to load bootstrap context');
    }

    const organizationId = await resolveAuthenticatedOrganizationId(req, res);
    if (organizationId === undefined) {
      return;
    }

    const [branding, organizationSettings] = await Promise.all([
      getOrganizationBrandingConfig(),
      organizationId ? findOrganizationSettings(organizationId) : Promise.resolve(null),
    ]);

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        profilePicture: user.profile_picture || null,
      },
      organizationId: organizationId ?? null,
      branding,
      preferences: pickStartupPreferences(preferences, organizationSettings?.config.timezone ?? null),
    });
  } catch (error) {
    logger.error('Failed to fetch auth bootstrap payload', { error });
    next(error);
  }
};
