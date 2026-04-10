/**
 * Contact Staff Provisioning Service
 * Ensures contacts assigned staff roles have user accounts and invitations.
 */

import type { Pool } from 'pg';
import { services } from '@container/services';
import { invitationService, syncUserRole } from '@services/domains/integration';

const STAFF_ROLE_MAP: Record<string, string> = {
  'Executive Director': 'admin',
  Staff: 'staff',
};

const getStaffRoleForContact = (roles: string[]): string | null => {
  if (roles.includes('Executive Director')) return STAFF_ROLE_MAP['Executive Director'];
  if (roles.includes('Staff')) return STAFF_ROLE_MAP.Staff;
  return null;
};

export type StaffProvisioningResult = { inviteUrl?: string; role?: string } | null;

export async function ensureStaffUserAccount(
  contactId: string,
  roles: string[],
  createdBy: string,
  dbPool: Pool = services.pool
): Promise<StaffProvisioningResult> {
  const targetRole = getStaffRoleForContact(roles);
  if (!targetRole) return null;

  const contactResult = await dbPool.query(
    'SELECT email, first_name, last_name FROM contacts WHERE id = $1',
    [contactId]
  );
  const contact = contactResult.rows[0] as
    | { email: string | null; first_name: string | null; last_name: string | null }
    | undefined;

  if (!contact?.email) {
    throw new Error('Staff roles require a contact email to create an account');
  }

  const existingUserResult = await dbPool.query('SELECT id, role FROM users WHERE email = $1', [
    contact.email.toLowerCase(),
  ]);

  if (existingUserResult.rows.length > 0) {
    const user = existingUserResult.rows[0] as { id: string; role: string };
    if (user.role !== targetRole) {
      await dbPool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [
        targetRole,
        user.id,
      ]);
    }
    await syncUserRole(user.id, targetRole, dbPool);
    return { role: targetRole };
  }

  try {
    const invitation = await invitationService.createInvitation(
      {
        email: contact.email,
        role: targetRole,
        message: `Auto-invite created from contact role assignment for ${contact.first_name} ${contact.last_name}`,
      },
      createdBy
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/accept-invitation/${invitation.token}`;
    return { inviteUrl, role: targetRole };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('pending invitation')) {
      return { role: targetRole };
    }
    throw error;
  }
}

