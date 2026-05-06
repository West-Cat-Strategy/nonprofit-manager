import { withUserContextTransaction } from '@config/database';
import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import * as repo from '../repositories/pendingRegistrationRepository';

type RejectionOutcome =
  | { kind: 'rejected'; pending: repo.PendingRegistrationRow }
  | { kind: 'not_found' }
  | { kind: 'already_processed'; status: string };

export async function rejectPendingRegistration(
  id: string,
  reviewedBy: string,
  reason?: string
): Promise<repo.PendingRegistrationRow> {
  const outcome = await withUserContextTransaction<RejectionOutcome>(reviewedBy, async (client) => {
    const pending = await repo.getPendingRegistrationByIdForUpdate(id, false, client);

    if (!pending) {
      return { kind: 'not_found' };
    }

    if (pending.status !== 'pending') {
      return { kind: 'already_processed', status: pending.status };
    }

    await repo.deletePendingRegistrationPasskeyData(id, client);
    const updated = await repo.updatePendingStatusIfPending(
      id,
      'rejected',
      reviewedBy,
      reason ?? null,
      client
    );

    if (!updated) {
      return { kind: 'already_processed', status: 'processed' };
    }

    return { kind: 'rejected', pending: updated };
  });

  if (outcome.kind === 'not_found') {
    throw new Error('Pending registration not found');
  }

  if (outcome.kind === 'already_processed') {
    throw new Error(`Registration has already been ${outcome.status}`);
  }

  const updated = outcome.pending;

  logger.info(`Pending registration rejected: ${updated.email} by user ${reviewedBy}`);

  // Best-effort: notify user
  sendRejectionEmail(updated.email, updated.first_name, reason).catch((err) => {
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
