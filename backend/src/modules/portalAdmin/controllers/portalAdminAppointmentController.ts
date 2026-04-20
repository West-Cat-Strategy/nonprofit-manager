import type { NextFunction, Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess } from '@modules/shared/http/envelope';
import { notFoundMessage } from '@utils/responseHelpers';
import {
  checkInAppointmentByStaff,
  createAppointmentSlot,
  deleteAppointmentSlot,
  getAppointmentById,
  listAdminAppointments,
  listAdminAppointmentSlots,
  updateAppointmentSlot,
  updateAppointmentStatusByStaff,
} from '../services/portalAppointmentSlotService';
import {
  listAppointmentReminders,
  sendAppointmentReminders,
} from '../services/appointmentReminderService';
import {
  ensurePortalAdmin,
  getPortalAdminQuery,
  handlePortalAppointmentError,
  handlePortalReminderError,
  notifyPortalUser,
} from './portalAdminController.shared';

export const listPortalAdminAppointmentSlots = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const query = getPortalAdminQuery<{
      status?: 'open' | 'closed' | 'cancelled';
      case_id?: string;
      pointperson_user_id?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }>(req);

    const slots = await listAdminAppointmentSlots({
      status: query.status,
      caseId: query.case_id,
      pointpersonUserId: query.pointperson_user_id,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    });

    sendSuccess(res, { slots });
  } catch (error) {
    next(error);
  }
};

export const createPortalAdminAppointmentSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const slot = await createAppointmentSlot({
      pointpersonUserId: req.body.pointperson_user_id,
      caseId: req.body.case_id || null,
      title: req.body.title || null,
      details: req.body.details || null,
      location: req.body.location || null,
      startTime: req.body.start_time,
      endTime: req.body.end_time,
      capacity: req.body.capacity,
      userId: req.user!.id,
    });

    sendSuccess(res, { slot }, 201);
  } catch (error) {
    next(error);
  }
};

export const updatePortalAdminAppointmentSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { slotId } = req.params;
    const slot = await updateAppointmentSlot({
      slotId,
      pointpersonUserId: req.body.pointperson_user_id,
      caseId: req.body.case_id,
      title: req.body.title,
      details: req.body.details,
      location: req.body.location,
      startTime: req.body.start_time,
      endTime: req.body.end_time,
      capacity: req.body.capacity,
      status: req.body.status,
      userId: req.user!.id,
    });

    if (!slot) {
      notFoundMessage(res, 'Appointment slot not found');
      return;
    }

    sendSuccess(res, { slot });
  } catch (error) {
    next(error);
  }
};

export const deletePortalAdminAppointmentSlot = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { slotId } = req.params;
    const deleted = await deleteAppointmentSlot(slotId);

    if (!deleted) {
      notFoundMessage(res, 'Appointment slot not found');
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const listPortalAdminAppointments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const query = getPortalAdminQuery<{
      status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
      request_type?: 'manual_request' | 'slot_booking';
      case_id?: string;
      pointperson_user_id?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
    }>(req);

    const result = await listAdminAppointments({
      status: query.status,
      requestType: query.request_type,
      caseId: query.case_id,
      pointpersonUserId: query.pointperson_user_id,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      page: query.page,
      limit: query.limit,
    });

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPortalAdminAppointmentReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    const reminders = await listAppointmentReminders(id);
    sendSuccess(res, reminders);
  } catch (error) {
    next(error);
  }
};

export const sendPortalAdminAppointmentReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    const summary = await sendAppointmentReminders(
      id,
      {
        sendEmail: req.body.sendEmail,
        sendSms: req.body.sendSms,
        customMessage: req.body.customMessage,
      },
      {
        triggerType: 'manual',
        sentBy: req.user?.id ?? null,
      }
    );

    sendSuccess(res, { summary });
  } catch (error) {
    if (handlePortalReminderError(res, error)) {
      return;
    }
    next(error);
  }
};

export const checkInPortalAdminAppointment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const appointment = await checkInAppointmentByStaff({
      appointmentId: id,
      checkedInBy: req.user!.id,
      resolutionNote: req.body.resolution_note,
      outcomeDefinitionIds: req.body.outcome_definition_ids,
      outcomeVisibility: req.body.outcome_visibility,
    });

    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    sendSuccess(res, { appointment });
  } catch (error) {
    if (handlePortalAppointmentError(res, error)) {
      return;
    }
    next(error);
  }
};

export const updatePortalAdminAppointmentStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!ensurePortalAdmin(req, res)) return;

    const { id } = req.params;
    const { status } = req.body as {
      status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
      resolution_note?: string;
      outcome_definition_ids?: string[];
      outcome_visibility?: boolean;
    };

    const appointment = await updateAppointmentStatusByStaff({
      appointmentId: id,
      status,
      checkedInBy: status === 'completed' ? req.user!.id : null,
      resolutionNote: req.body.resolution_note,
      outcomeDefinitionIds: req.body.outcome_definition_ids,
      outcomeVisibility: req.body.outcome_visibility,
    });

    if (!appointment) {
      notFoundMessage(res, 'Appointment not found');
      return;
    }

    const refreshed = await getAppointmentById(id);
    if (refreshed?.portal_email) {
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      await notifyPortalUser({
        to: refreshed.portal_email,
        subject: `Appointment ${statusLabel}`,
        body: [
          `Your appointment "${refreshed.title}" is now ${status}.`,
          '',
          `Start: ${new Date(refreshed.start_time).toLocaleString()}`,
          refreshed.location ? `Location: ${refreshed.location}` : '',
          refreshed.case_number ? `Case: ${refreshed.case_number}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      });
    }

    sendSuccess(res, { appointment: refreshed || appointment });
  } catch (error) {
    if (handlePortalAppointmentError(res, error)) {
      return;
    }
    next(error);
  }
};
