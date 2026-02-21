import bcrypt from 'bcryptjs';
import { logPortalActivity } from '@services/domains/integration';
import { PortalRepository } from '../repositories/portalRepository';

const normalizeUserAgent = (userAgent?: string | string[]): string | null =>
  typeof userAgent === 'string' ? userAgent : null;

export class PortalProfileUseCase {
  constructor(private readonly repository: PortalRepository) {}

  async getProfile(contactId: string): Promise<Record<string, unknown> | null> {
    return this.repository.getProfile(contactId);
  }

  async updateProfile(input: {
    contactId: string;
    portalUserId: string;
    body: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<Record<string, unknown> | null> {
    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'mobile_phone',
      'address_line1',
      'address_line2',
      'city',
      'state_province',
      'postal_code',
      'country',
      'preferred_contact_method',
      'pronouns',
      'gender',
      'profile_picture',
    ];

    const updates: Record<string, string | null> = {};
    allowedFields.forEach((field) => {
      if (input.body[field] !== undefined) {
        updates[field] = (input.body[field] as string | null) ?? null;
      }
    });

    const profile = await this.repository.updateProfile(input.contactId, updates);
    if (!profile) {
      return null;
    }

    if (typeof input.body.email === 'string' && input.body.email.length > 0) {
      await this.repository.syncPortalUserEmail(input.portalUserId, input.body.email);
    }

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'profile.update',
      details: 'Profile updated',
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return profile;
  }

  async changePassword(input: {
    portalUserId: string;
    currentPassword: string;
    newPassword: string;
    ipAddress?: string;
    userAgent?: string | string[];
  }): Promise<'updated' | 'invalid_password' | 'user_not_found'> {
    const currentHash = await this.repository.getPortalUserPasswordHash(input.portalUserId);
    if (!currentHash) {
      return 'user_not_found';
    }

    const valid = await bcrypt.compare(input.currentPassword, currentHash);
    if (!valid) {
      return 'invalid_password';
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await this.repository.updatePortalUserPassword(input.portalUserId, newHash);

    await logPortalActivity({
      portalUserId: input.portalUserId,
      action: 'password.change',
      details: 'Password changed',
      ipAddress: input.ipAddress,
      userAgent: normalizeUserAgent(input.userAgent),
    });

    return 'updated';
  }
}
