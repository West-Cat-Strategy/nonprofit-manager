import bcrypt from 'bcryptjs';
import { PASSWORD } from '@config/constants';
import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import { escapeHtml } from '@services/site-generator/escapeHtml';
import { issueAdminPendingRegistrationReviewToken } from '@utils/sessionTokens';
import * as repo from '../repositories/pendingRegistrationRepository';

const ADMIN_NOTIFICATION_BATCH_SIZE = 4;

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

export interface CreatePendingRegistrationResult {
  pendingRegistration: repo.PendingRegistrationRow;
  passkeySetupAllowed: boolean;
}

export async function createPendingRegistration(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<CreatePendingRegistrationResult> {
  // Check if email already has a pending request
  const existingId = await repo.findPendingByEmail(data.email);
  if (existingId) {
    throw new Error('A registration request for this email is already pending');
  }

  // Also check if user already exists
  const existingUserId = await repo.findUserByEmail(data.email);
  if (existingUserId) {
    throw new Error('An account with this email already exists');
  }

  const passkeySetupAllowed = await repo.supportsPendingRegistrationPasskeyStaging();
  const hashedPassword = await bcrypt.hash(data.password, PASSWORD.BCRYPT_SALT_ROUNDS);

  const pending = await repo.insertPendingRegistration({
    email: data.email,
    passwordHash: hashedPassword,
    firstName: data.firstName,
    lastName: data.lastName,
  });

  logger.info(`Pending registration created for: ${data.email}`);

  // Best-effort: notify admins via email
  notifyAdminsOfPendingRegistration(
    pending.id,
    data.email,
    data.firstName,
    data.lastName
  ).catch((err) => {
    logger.warn('Failed to send admin notification for pending registration', err);
  });

  return {
    pendingRegistration: pending,
    passkeySetupAllowed,
  };
}

async function notifyAdminsOfPendingRegistration(
  pendingRegistrationId: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  const adminRecipients = await repo.listAdminRecipients();
  const frontendUrl = getFrontendUrl();

  const name = [firstName, lastName].filter(Boolean).join(' ') || email;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);

  for (let i = 0; i < adminRecipients.length; i += ADMIN_NOTIFICATION_BATCH_SIZE) {
    const batch = adminRecipients.slice(i, i + ADMIN_NOTIFICATION_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((recipient) => {
        const approveToken = issueAdminPendingRegistrationReviewToken({
          pendingRegistrationId,
          adminUserId: recipient.id,
          action: 'approve',
        });
        const rejectToken = issueAdminPendingRegistrationReviewToken({
          pendingRegistrationId,
          adminUserId: recipient.id,
          action: 'reject',
        });
        const approveUrl = `${frontendUrl}/admin-registration-review/${approveToken}`;
        const rejectUrl = `${frontendUrl}/admin-registration-review/${rejectToken}`;
        const approveAutoUrl = `${approveUrl}?mode=complete`;
        const rejectAutoUrl = `${rejectUrl}?mode=complete`;
        const reviewerName =
          [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || recipient.email;

        return sendMail({
          to: recipient.email,
          subject: 'New Registration Request Pending Approval',
          text: [
            `Hi ${reviewerName},`,
            '',
            'A new user registration request requires your review.',
            '',
            `Name: ${name}`,
            `Email: ${email}`,
            '',
            'Use the secure review buttons in the HTML version of this email, or open one of these manual review links:',
            `Approve request: ${approveUrl}`,
            `Reject request: ${rejectUrl}`,
            '',
            'These review links expire in 7 days.',
          ].join('\n'),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
              <h2 style="margin:0 0 12px">New Registration Request</h2>
              <p style="margin:0 0 16px">A new user registration request requires your review.</p>
              <table style="border-collapse:collapse;margin:0 0 20px">
                <tr>
                  <td style="padding:4px 12px 4px 0;font-weight:bold">Name:</td>
                  <td style="padding:4px 0">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding:4px 12px 4px 0;font-weight:bold">Email:</td>
                  <td style="padding:4px 0">${safeEmail}</td>
                </tr>
              </table>
              <p style="margin:0 0 16px;color:#4b5563">
                Use the secure review buttons below to approve or reject this request in one click.
              </p>
              <div style="display:flex;flex-wrap:wrap;gap:12px;margin:0 0 16px">
                <a
                  href="${escapeHtml(approveAutoUrl)}"
                  style="display:inline-block;padding:12px 18px;border-radius:10px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600"
                >
                  Approve request
                </a>
                <a
                  href="${escapeHtml(rejectAutoUrl)}"
                  style="display:inline-block;padding:12px 18px;border-radius:10px;background:#ffffff;color:#111827;text-decoration:none;font-weight:600;border:1px solid #d1d5db"
                >
                  Reject request
                </a>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#4b5563">These review links expire in 7 days.</p>
              <p style="margin:0;font-size:13px;color:#4b5563">
                If the buttons do not open, use these manual review links directly:<br />
                <a href="${escapeHtml(approveUrl)}">${escapeHtml(approveUrl)}</a><br />
                <a href="${escapeHtml(rejectUrl)}">${escapeHtml(rejectUrl)}</a>
              </p>
            </div>
          `,
        });
      })
    );

    settled.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn('Failed to send pending-registration admin notification', {
          adminEmail: batch[index]?.email,
          error: result.reason,
        });
      }
    });
  }
}
