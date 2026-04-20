import type { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendMail } from '@services/emailService';
import { guardWithPermission } from '@services/authGuardService';
import { badRequest } from '@utils/responseHelpers';
import { Permission } from '@utils/permissions';

export type PortalSignupResolutionStatus = 'resolved' | 'needs_contact_resolution';

export interface PortalSignupApprovalRow {
  id: string;
  email: string;
  password_hash: string;
  contact_id: string | null;
  status: string;
  resolution_status: PortalSignupResolutionStatus;
}

export const ensurePortalAdmin = (req: AuthRequest, res: Response): boolean =>
  guardWithPermission(req, res, Permission.ADMIN_USERS);

export const getPortalAdminQuery = <T extends object>(req: AuthRequest): T =>
  (req.validatedQuery ?? req.query) as T;

export const notifyPortalUser = async (args: {
  to: string | null | undefined;
  subject: string;
  body: string;
}): Promise<void> => {
  if (!args.to) {
    return;
  }

  try {
    await sendMail({
      to: args.to,
      subject: args.subject,
      text: args.body,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;white-space:pre-wrap">${args.body}</div>`,
    });
  } catch {
    // Degrade gracefully to in-app updates if email is unavailable.
  }
};

export const handlePortalReminderError = (res: Response, error: unknown): boolean => {
  if (error instanceof Error && error.message.includes('eligible for reminders')) {
    badRequest(res, error.message);
    return true;
  }

  return false;
};

export const handlePortalAppointmentError = (res: Response, error: unknown): boolean => {
  if (
    error instanceof Error &&
    (/slot/i.test(error.message) || /resolution_note|outcome definition/i.test(error.message))
  ) {
    badRequest(res, error.message);
    return true;
  }

  return false;
};
