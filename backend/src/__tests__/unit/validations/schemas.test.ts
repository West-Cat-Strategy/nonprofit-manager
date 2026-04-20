/**
 * Validation Schemas Tests
 * Unit tests for Zod schemas
 */

import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  pendingPasskeyRegistrationOptionsSchema,
  pendingPasskeyRegistrationVerifySchema,
  passwordResetRequestSchema,
  setupFirstUserSchema,
  twoFactorVerifySchema,
} from '../../../validations/auth';
import { createVolunteerSchema, updateVolunteerSchema } from '../../../validations/volunteer';
import { createEventSchema } from '../../../validations/event';
import {
  emailSchema,
  isoDateSchema,
  isoDateTimeSchema,
  optionalStrictBooleanSchema,
  paginationSchema,
  passwordSchema,
} from '../../../validations/shared';
import { portalChangePasswordSchema, portalSignupSchema } from '../../../validations/portal';

describe('Shared Validation Schemas', () => {
  it('trims and normalizes email input before validation', () => {
    const result = emailSchema.safeParse('  User@Example.com  ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('user@example.com');
    }
  });

  it('parses only strict boolean-like inputs', () => {
    expect(optionalStrictBooleanSchema.safeParse('false')).toEqual({
      success: true,
      data: false,
    });
    expect(optionalStrictBooleanSchema.safeParse('1')).toEqual({
      success: true,
      data: true,
    });
    expect(optionalStrictBooleanSchema.safeParse('yes').success).toBe(false);
  });

  it('accepts only real ISO calendar dates', () => {
    expect(isoDateSchema.safeParse('2026-03-11').success).toBe(true);
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(isoDateSchema.safeParse('03/11/2026').success).toBe(false);
  });

  it('requires timezone-aware ISO datetimes', () => {
    expect(isoDateTimeSchema.safeParse('2026-03-11T12:00:00Z').success).toBe(true);
    expect(isoDateTimeSchema.safeParse('2026-03-11T12:00:00+00:00').success).toBe(true);
    expect(isoDateTimeSchema.safeParse('2026-03-11T12:00:00').success).toBe(false);
    expect(isoDateTimeSchema.safeParse('March 11, 2026').success).toBe(false);
  });
});

describe('Authentication Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should normalize email to lowercase', () => {
      const data = {
        email: 'User@Example.COM',
        password: 'password123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.email).toBe('user@example.com');
      }
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        password_confirm: 'SecurePass123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
          passwordConfirm: 'SecurePass123',
        });
      }
    });

    it('accepts canonical camelCase registration fields', () => {
      const result = registerSchema.safeParse({
        email: 'camel@example.com',
        password: 'CorrectHorseStaple123!',
        passwordConfirm: 'CorrectHorseStaple123!',
        firstName: 'Camel',
        lastName: 'Case',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          firstName: 'Camel',
          lastName: 'Case',
          passwordConfirm: 'CorrectHorseStaple123!',
        });
      }
    });

    it('should require strong password', () => {
      const weakPassword = {
        email: 'user@example.com',
        password: 'weak',
        password_confirm: 'weak',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = registerSchema.safeParse(weakPassword);
      expect(result.success).toBe(false);
    });

    it('should require password confirmation match', () => {
      const mismatchData = {
        email: 'user@example.com',
        password: 'SecurePass123',
        password_confirm: 'DifferentPass123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const result = registerSchema.safeParse(mismatchData);
      expect(result.success).toBe(false);
    });

    it('should require uppercase, lowercase, and number in password', () => {
      const testCases = [
        {
          password: 'nouppercase123',
          password_confirm: 'nouppercase123',
          shouldPass: false,
        },
        {
          password: 'NOLOWERCASE123',
          password_confirm: 'NOLOWERCASE123',
          shouldPass: false,
        },
        {
          password: 'NoNumbersHere',
          password_confirm: 'NoNumbersHere',
          shouldPass: false,
        },
        {
          password: 'ValidPass123',
          password_confirm: 'ValidPass123',
          shouldPass: true,
        },
      ];

      testCases.forEach(({ password, password_confirm, shouldPass }) => {
        const data = {
          email: 'user@example.com',
          password,
          password_confirm,
          first_name: 'John',
          last_name: 'Doe',
        };

        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(shouldPass);
      });
    });
  });

  describe('pendingPasskeyRegistration schemas', () => {
    it('accepts pending passkey registration options input', () => {
      const result = pendingPasskeyRegistrationOptionsSchema.safeParse({
        registrationToken: 'pending-token',
        email: 'Pending.User@example.com',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('pending.user@example.com');
      }
    });

    it('accepts pending passkey registration verification input', () => {
      const result = pendingPasskeyRegistrationVerifySchema.safeParse({
        registrationToken: 'pending-token',
        challengeId: 'challenge-id',
        credential: { id: 'credential-id' },
        name: 'Pending User',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('setupFirstUserSchema', () => {
    const baseSetupData = {
      email: 'setup@example.com',
      first_name: 'Setup',
      last_name: 'Admin',
      organization_name: 'Setup Org',
    };

    it('accepts passwords with common special characters', () => {
      const result = setupFirstUserSchema.safeParse({
        ...baseSetupData,
        password: 'Strong1#Password',
        password_confirm: 'Strong1#Password',
      });

      expect(result.success).toBe(true);
    });

    it('accepts passwords without special characters', () => {
      const result = setupFirstUserSchema.safeParse({
        ...baseSetupData,
        password: 'Strong1Password',
        password_confirm: 'Strong1Password',
      });

      expect(result.success).toBe(true);
    });

    it('accepts and normalizes canonical setup fields', () => {
      const result = setupFirstUserSchema.safeParse({
        email: 'setup2@example.com',
        password: 'Strong1Password',
        passwordConfirm: 'Strong1Password',
        firstName: 'Setup',
        lastName: 'Admin',
        organizationName: 'Setup Org 2',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          email: 'setup2@example.com',
          firstName: 'Setup',
          lastName: 'Admin',
          organizationName: 'Setup Org 2',
          passwordConfirm: 'Strong1Password',
        });
      }
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts and normalizes canonical password fields', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'CurrentPass123',
        newPassword: 'NewPass123',
        newPasswordConfirm: 'NewPass123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          currentPassword: 'CurrentPass123',
          newPassword: 'NewPass123',
          newPasswordConfirm: 'NewPass123',
        });
      }
    });

    it('accepts legacy snake_case password fields', () => {
      const result = changePasswordSchema.safeParse({
        current_password: 'CurrentPass123',
        new_password: 'NewPass123',
        new_password_confirm: 'NewPass123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          currentPassword: 'CurrentPass123',
          newPassword: 'NewPass123',
          newPasswordConfirm: 'NewPass123',
        });
      }
    });
  });

  describe('passwordResetRequestSchema', () => {
    it('should validate email reset request', () => {
      const data = {
        email: 'user@example.com',
      };

      const result = passwordResetRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
      };

      const result = passwordResetRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('twoFactorVerifySchema', () => {
    it('accepts code field for TOTP verification', () => {
      const result = twoFactorVerifySchema.safeParse({
        mfaToken: 'mfa-token',
        code: '123456',
      });

      expect(result.success).toBe(true);
    });

    it('accepts legacy token field for TOTP verification', () => {
      const result = twoFactorVerifySchema.safeParse({
        mfaToken: 'mfa-token',
        token: '123456',
      });

      expect(result.success).toBe(true);
    });

    it('rejects missing code/token for TOTP verification', () => {
      const result = twoFactorVerifySchema.safeParse({
        mfaToken: 'mfa-token',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Volunteer Schemas', () => {
  describe('createVolunteerSchema', () => {
    it('should validate correct volunteer creation', () => {
      const validData = {
        contact_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        background_check_status: 'approved',
        availability_status: 'available',
        skills: ['mentoring', 'tutoring'],
      };

      const result = createVolunteerSchema.safeParse(validData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.status).toBe('active');
        expect(result.data.skills).toHaveLength(2);
      }
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        contact_id: 'not-a-uuid',
      };

      const result = createVolunteerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidData = {
        contact_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'invalid_status',
      };

      const result = createVolunteerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should provide defaults for optional fields', () => {
      const minimalData = {
        contact_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createVolunteerSchema.safeParse(minimalData);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.status).toBe('active');
        expect(result.data.background_check_status).toBe('not_required');
      }
    });
  });

  describe('updateVolunteerSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        status: 'inactive',
      };

      const result = updateVolunteerSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const data = {
        status: 'on_leave',
        bio: 'Updated bio',
        skills: ['new', 'skills'],
      };

      const result = updateVolunteerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

describe('Event Schemas', () => {
  describe('createEventSchema', () => {
    const baseDate = new Date('2025-06-01');
    const endDate = new Date('2025-06-02');

    it('should validate correct event data', () => {
      const validData = {
        event_name: 'Community Cleanup',
        description: 'Clean up the local park',
        event_type: 'community',
        start_date: baseDate,
        end_date: endDate,
        location_name: 'Central Park',
        capacity: 20,
      };

      const result = createEventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject end date before start date', () => {
      const invalidData = {
        event_name: 'Event',
        event_type: 'community',
        start_date: endDate,
        end_date: baseDate,
      };

      const result = createEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should provide default status', () => {
      const data = {
        event_name: 'Event',
        event_type: 'community',
        start_date: baseDate,
        end_date: endDate,
      };

      const result = createEventSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.status).toBe('planned');
      }
    });
  });
});

describe('Shared Schemas', () => {
  describe('passwordSchema', () => {
    const passwordCases = [
      { password: 'Strong1Password', shouldPass: true },
      { password: 'Strong1#Password', shouldPass: true },
      { password: 'Valid9_^word', shouldPass: true },
      { password: 'nouppercase123', shouldPass: false },
      { password: 'NOLOWERCASE123', shouldPass: false },
      { password: 'NoNumbersHere', shouldPass: false },
      { password: 'Shrt1a', shouldPass: false },
    ];

    it.each(passwordCases)('validates "$password" => $shouldPass', ({ password, shouldPass }) => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(shouldPass);
    });
  });

  describe('paginationSchema', () => {
    it('should provide defaults', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should coerce string to number', () => {
      const data = {
        page: '2',
        limit: '25',
      };

      const result = paginationSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(typeof result.data.page).toBe('number');
        expect(result.data.page).toBe(2);
      }
    });

    it('should enforce min/max limits', () => {
      const tooHigh = {
        limit: 150,
      };

      const result = paginationSchema.safeParse(tooHigh);
      expect(result.success).toBe(false);
    });
  });
});

describe('Portal Schemas', () => {
  it('accepts portal signup passwords without required special characters', () => {
    const result = portalSignupSchema.safeParse({
      email: 'portal@example.com',
      password: 'Portal1Password',
      firstName: 'Portal',
      lastName: 'User',
    });

    expect(result.success).toBe(true);
  });

  it('accepts portal password updates with non-whitelisted special characters', () => {
    const result = portalChangePasswordSchema.safeParse({
      currentPassword: 'Current1Password',
      newPassword: 'Portal1#Password',
    });

    expect(result.success).toBe(true);
  });
});
