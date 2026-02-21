import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalProfileUseCase } from '../usecases/profileUseCase';

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;

export const createPortalProfileController = (useCase: PortalProfileUseCase) => {
  const getProfile = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const profile = await useCase.getProfile(contactId);
      if (!profile) {
        sendError(res, 'CONTACT_NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  };

  const updateProfile = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId || !req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const profile = await useCase.updateProfile({
        contactId,
        portalUserId: req.portalUser.id,
        body: req.body as Record<string, unknown>,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (!profile) {
        sendError(res, 'CONTACT_NOT_FOUND', 'Contact not found', 404);
        return;
      }

      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  };

  const changePassword = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.portalUser?.id) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const currentPassword = req.body.currentPassword as string | undefined;
      const newPassword = req.body.newPassword as string | undefined;

      if (!currentPassword || !newPassword) {
        sendError(res, 'VALIDATION_ERROR', 'Current password and new password are required', 400);
        return;
      }

      if (newPassword.length < 8) {
        sendError(res, 'VALIDATION_ERROR', 'New password must be at least 8 characters', 400);
        return;
      }

      const result = await useCase.changePassword({
        portalUserId: req.portalUser.id,
        currentPassword,
        newPassword,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (result === 'user_not_found') {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      if (result === 'invalid_password') {
        sendError(res, 'INVALID_PASSWORD', 'Current password is incorrect', 400);
        return;
      }

      sendSuccess(res, { message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  };

  return {
    getProfile,
    updateProfile,
    changePassword,
  };
};
