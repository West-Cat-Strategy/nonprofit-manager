import pool from '@config/database';
import { logger } from '@config/logger';
import { syncUserRole } from '@services/domains/integration';
import { seedDefaultOrganizationAccess } from '@services/accountAccessService';
import { sendMail } from '@services/emailService';
import { getRegistrationSettings } from './registrationSettingsUseCase';
import { normalizeRoleSlug } from '@utils/roleSlug';
import * as repo from '../repositories/pendingRegistrationRepository';

export async function approvePendingRegistration(
  id: string,
  reviewedBy: string
): Promise<{ user: { id: string; email: string; first_name: string; last_name: string; role: string } }> {
  const pending = await repo.getPendingRegistrationById(id, true);

  if (!pending) {
    throw new Error('Pending registration not found');
  }

  if (pending.status !== 'pending') {
    throw new Error(`Registration has already been ${pending.status}`);
  }

  // Check email not already taken
  const existingUserId = await repo.findUserByEmail(pending.email);
  if (existingUserId) {
    // Mark as rejected with explanation
    await repo.updatePendingStatus(
      id,
      'rejected',
      reviewedBy,
      'An account with this email already exists'
    );
    throw new Error('An account with this email already exists');
  }

  // Get default role from settings
  const settings = await getRegistrationSettings();
  const normalizedRole = normalizeRoleSlug(settings.defaultRole) ?? settings.defaultRole;

  // Use a transaction for the multi-step update
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create the real user with the stored password hash
    const user = await repo.createRealUser(
      {
        email: pending.email,
        passwordHash: pending.password_hash,
        firstName: pending.first_name,
        lastName: pending.last_name,
        role: normalizedRole,
      },
      client
    );

    // Sync role (internal integration)
    await syncUserRole(user.id, user.role, client);
    await seedDefaultOrganizationAccess(
      {
        userId: user.id,
        role: user.role,
        grantedBy: reviewedBy,
      },
      client
    );
    await repo.attachPendingRegistrationCredentialsToUser(id, user.id, client);

    // Mark pending as approved
    await repo.updatePendingStatus(id, 'approved', reviewedBy, null, client);

    await client.query('COMMIT');

    logger.info(`Pending registration approved: ${pending.email} by user ${reviewedBy}`);

    // Best-effort: notify user
    sendApprovalEmail(pending.email, pending.first_name).catch((err) => {
      logger.warn('Failed to send approval notification', err);
    });

    return { user };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function sendApprovalEmail(email: string, firstName: string | null): Promise<void> {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  await sendMail({
    to: email,
    subject: 'Your Registration Has Been Approved',
    text: `${greeting}\n\nYour registration has been approved! You can now log in to your account.\n\nThank you.`,
    html: `
      <h2>Registration Approved</h2>
      <p>${greeting}</p>
      <p>Your registration has been approved! You can now log in to your account.</p>
      <p>Thank you.</p>
    `,
  });
}
