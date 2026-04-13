import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import * as repo from '../repositories/pendingRegistrationRepository';

export async function rejectPendingRegistration(
  id: string,
  reviewedBy: string,
  reason?: string
): Promise<repo.PendingRegistrationRow> {
  const pending = await repo.getPendingRegistrationById(id);

  if (!pending) {
    throw new Error('Pending registration not found');
  }

  if (pending.status !== 'pending') {
    throw new Error(`Registration has already been ${pending.status}`);
  }

  const updated = await repo.updatePendingStatus(id, 'rejected', reviewedBy, reason ?? null);

  logger.info(`Pending registration rejected: ${pending.email} by user ${reviewedBy}`);

  // Best-effort: notify user
  sendRejectionEmail(pending.email, pending.first_name, reason).catch((err) => {
    logger.warn('Failed to send rejection notification', err);
  });

  return updated;
}

async function sendRejectionEmail(
  email: string,
  firstName: string | null,
  reason?: string
): Promise<void> {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  const reasonText = reason ? `\n\nReason: ${reason}` : '';
  await sendMail({
    to: email,
    subject: 'Your Registration Request',
    text: `${greeting}\n\nThank you for your interest. Unfortunately, your registration request was not approved at this time.${reasonText}\n\nIf you believe this is in error, please contact the organization directly.`,
    html: `
      <h2>Registration Update</h2>
      <p>${greeting}</p>
      <p>Thank you for your interest. Unfortunately, your registration request was not approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you believe this is in error, please contact the organization directly.</p>
    `,
  });
}
