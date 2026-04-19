import { withUserContextTransaction } from '@config/database';
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

  const user = await withUserContextTransaction(reviewedBy, async (client) => {
    // Create the real user with the stored password hash
    const createdUser = await repo.createRealUser(
      {
        email: pending.email,
        passwordHash: pending.password_hash,
        firstName: pending.first_name,
        lastName: pending.last_name,
        role: normalizedRole,
        createdBy: reviewedBy,
        modifiedBy: reviewedBy,
      },
      client
    );

    // Sync role (internal integration)
    await syncUserRole(createdUser.id, createdUser.role, client);
    await seedDefaultOrganizationAccess(
      {
        userId: createdUser.id,
        role: createdUser.role,
        grantedBy: reviewedBy,
      },
      client
    );
    await repo.attachPendingRegistrationCredentialsToUser(id, createdUser.id, client);

    // Mark pending as approved
    await repo.updatePendingStatus(id, 'approved', reviewedBy, null, client);

    return createdUser;
  });

  logger.info(`Pending registration approved: ${pending.email} by user ${reviewedBy}`);

  // Best-effort: notify user
  sendApprovalEmail(pending.email, pending.first_name).catch((err) => {
    logger.warn('Failed to send approval notification', err);
  });

  return { user };
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
