import bcrypt from 'bcryptjs';
import { PASSWORD } from '@config/constants';
import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import * as repo from '../repositories/pendingRegistrationRepository';

const ADMIN_NOTIFICATION_BATCH_SIZE = 4;

export async function createPendingRegistration(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<repo.PendingRegistrationRow> {
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

  const hashedPassword = await bcrypt.hash(data.password, PASSWORD.BCRYPT_SALT_ROUNDS);

  const pending = await repo.insertPendingRegistration({
    email: data.email,
    passwordHash: hashedPassword,
    firstName: data.firstName,
    lastName: data.lastName,
  });

  logger.info(`Pending registration created for: ${data.email}`);

  // Best-effort: notify admins via email
  notifyAdminsOfPendingRegistration(data.email, data.firstName, data.lastName).catch((err) => {
    logger.warn('Failed to send admin notification for pending registration', err);
  });

  return pending;
}

async function notifyAdminsOfPendingRegistration(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<void> {
  const adminEmails = await repo.listAdminEmails();

  const name = [firstName, lastName].filter(Boolean).join(' ') || email;

  for (let i = 0; i < adminEmails.length; i += ADMIN_NOTIFICATION_BATCH_SIZE) {
    const batch = adminEmails.slice(i, i + ADMIN_NOTIFICATION_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map((adminEmail) =>
        sendMail({
          to: adminEmail,
          subject: 'New Registration Request Pending Approval',
          text: `A new user registration request requires your review.\n\nName: ${name}\nEmail: ${email}\n\nPlease log in to the admin settings to approve or reject this request.`,
          html: `
            <h2>New Registration Request</h2>
            <p>A new user registration request requires your review.</p>
            <table style="border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Name:</td><td>${name}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold">Email:</td><td>${email}</td></tr>
            </table>
            <p>Please log in to the admin settings to approve or reject this request.</p>
          `,
        })
      )
    );

    settled.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn('Failed to send pending-registration admin notification', {
          adminEmail: batch[index],
          error: result.reason,
        });
      }
    });
  }
}
