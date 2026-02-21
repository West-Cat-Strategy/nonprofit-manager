import { NextFunction, Response } from 'express';
import { PortalAuthRequest } from '@middleware/portalAuth';
import { sendError, sendSuccess } from '../../shared/http/envelope';
import { PortalAppointmentsUseCase } from '../usecases/appointmentsUseCase';

const getPortalContactId = (req: PortalAuthRequest): string | null => req.portalUser?.contactId ?? null;

export const createPortalAppointmentsController = (useCase: PortalAppointmentsUseCase) => {
  const getAppointments = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const appointments = await useCase.list(contactId);
      sendSuccess(res, appointments);
    } catch (error) {
      next(error);
    }
  };

  const getSlots = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      if (!contactId) {
        sendError(res, 'PORTAL_CONTACT_MISSING', 'Portal user not linked to a contact', 400);
        return;
      }

      const caseId = typeof req.query.case_id === 'string' ? req.query.case_id : undefined;
      const slots = await useCase.listSlots(contactId, caseId);
      sendSuccess(res, slots);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.toLowerCase().includes('slot') ||
          error.message.toLowerCase().includes('appointment') ||
          error.message.toLowerCase().includes('case'))
      ) {
        sendError(res, 'APPOINTMENT_ERROR', error.message, 400);
        return;
      }
      next(error);
    }
  };

  const bookSlot = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const appointment = await useCase.bookSlot({
        slotId: req.params.slotId,
        contactId,
        portalUserId,
        caseId: (req.body.case_id as string | undefined) ?? null,
        title: (req.body.title as string | undefined) ?? null,
        description: (req.body.description as string | undefined) ?? null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      sendSuccess(res, { appointment }, 201);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.toLowerCase().includes('slot') ||
          error.message.toLowerCase().includes('appointment') ||
          error.message.toLowerCase().includes('case'))
      ) {
        sendError(res, 'APPOINTMENT_ERROR', error.message, 400);
        return;
      }
      next(error);
    }
  };

  const createRequest = async (req: PortalAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const appointment = await useCase.createManualRequest({
        contactId,
        portalUserId,
        caseId: (req.body.case_id as string | undefined) ?? null,
        title: req.body.title as string,
        description: (req.body.description as string | undefined) ?? null,
        startTime: req.body.start_time as string,
        endTime: (req.body.end_time as string | undefined) ?? null,
        location: (req.body.location as string | undefined) ?? null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      sendSuccess(res, { appointment }, 201);
    } catch (error) {
      next(error);
    }
  };

  const cancelAppointment = async (
    req: PortalAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const contactId = getPortalContactId(req);
      const portalUserId = req.portalUser?.id;
      if (!contactId || !portalUserId) {
        sendError(res, 'PORTAL_USER_INVALID', 'Portal user context missing', 400);
        return;
      }

      const appointment = await useCase.cancel({
        appointmentId: req.params.id,
        contactId,
        portalUserId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (!appointment) {
        sendError(res, 'APPOINTMENT_NOT_FOUND', 'Appointment not found', 404);
        return;
      }

      sendSuccess(res, { appointment });
    } catch (error) {
      next(error);
    }
  };

  return {
    getAppointments,
    getSlots,
    bookSlot,
    createRequest,
    cancelAppointment,
  };
};
