import { withUserContextTransaction } from '@config/database';
import { logger } from '@config/logger';
import { syncUserRole } from '@services/domains/integration';
import { seedDefaultOrganizationAccess } from '@services/accountAccessService';
import { sendMail } from '@services/emailService';
import { getRegistrationSettings } from './registrationSettingsUseCase';
import { normalizeRoleSlug } from '@utils/roleSlug';
import * as repo from '../repositories/pendingRegistrationRepository';

type ApprovalOutcome =
  | {
      kind: 'approved';
      user: { id: string; email: string; first_name: string; last_name: string; role: string };
      pendingEmail: string;
      pendingFirstName: string | null;
    }
  | { kind: 'not_found' }
  | { kind: 'already_processed'; status: string }
  | { kind: 'existing_user' };

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === '23505';

export async function approvePendingRegistration(
  id: string,
  reviewedBy: string
): Promise<{
  user: { id: string; email: string; first_name: string; last_name: string; role: string };
}> {
  // Get default role from settings
  const settings = await getRegistrationSettings();
  const normalizedRole = normalizeRoleSlug(settings.defaultRole) ?? settings.defaultRole;

  let outcome: ApprovalOutcome;
  try {
    outcome = await withUserContextTransaction<ApprovalOutcome>(reviewedBy, async (client) => {
      const pending = await repo.getPendingRegistrationByIdForUpdate(id, true, client);

      if (!pending) {
        return { kind: 'not_found' };
      }

      if (pending.status !== 'pending') {
        return { kind: 'already_processed', status: pending.status };
      }

      const existingUserId = await repo.findUserByEmail(pending.email, client);
      if (existingUserId) {
        await repo.updatePendingStatusIfPending(
          id,
          'rejected',
          reviewedBy,
          'An account with this email already exists',
          client
        );
        return { kind: 'existing_user' };
      }

      const statusUpdate = await repo.updatePendingStatusIfPending(
        id,
        'approved',
        reviewedBy,
        null,
        client
      );
      if (!statusUpdate) {
        return { kind: 'already_processed', status: 'processed' };
      }

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

      return {
        kind: 'approved',
        user: createdUser,
        pendingEmail: pending.email,
        pendingFirstName: pending.first_name,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw Object.assign(new Error('An account with this email already exists'), {
        cause: error,
      });
    }
    throw error;
  }

  if (outcome.kind === 'not_found') {
    throw new Error('Pending registration not found');
  }

  if (outcome.kind === 'already_processed') {
    throw new Error(`Registration has already been ${outcome.status}`);
  }

  if (outcome.kind === 'existing_user') {
    throw new Error('An account with this email already exists');
  }

  logger.info(`Pending registration approved: ${outcome.pendingEmail} by user ${reviewedBy}`);

  // Best-effort: notify user
  sendApprovalEmail(outcome.pendingEmail, outcome.pendingFirstName).catch((err) => {
    logger.warn('Failed to send approval notification', err);
  });

  return { user: outcome.user };
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
