/**
 * Validation Schemas Tests
 * Unit tests for Zod schemas
 */

import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
} from '../../../validations/auth';
import {
  createVolunteerSchema,
  updateVolunteerSchema,
} from '../../../validations/volunteer';
import {
  createEventSchema,
} from '../../../validations/event';
import { paginationSchema } from '../../../validations/shared';

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
        expect(result.data.background_check_status).toBe('not_started');
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
