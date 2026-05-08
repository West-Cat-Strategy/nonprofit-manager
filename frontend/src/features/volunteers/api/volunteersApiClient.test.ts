import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { volunteersApiClient } from './volunteersApiClient';
import type { Volunteer } from '../types/contracts';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const approvedVolunteer = {
  volunteer_id: 'volunteer-1',
  contact_id: 'contact-1',
  skills: [],
  availability_status: 'available',
  availability_notes: null,
  background_check_status: 'approved',
  background_check_date: '2026-05-06',
  background_check_expiry: null,
  background_check_approved_by: 'staff-1',
  background_check_approved_at: '2026-05-06T17:00:00.000Z',
  background_check_approval_notes: 'Cleared after review.',
  preferred_roles: null,
  max_hours_per_week: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  volunteer_since: '2026-01-01T00:00:00.000Z',
  total_hours_logged: 0,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-05-06T17:00:00.000Z',
} satisfies Volunteer;

describe('volunteersApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts staff background-check approvals to the dedicated endpoint', async () => {
    const payload = {
      notes: 'Cleared after review.',
      background_check_date: '2026-05-06',
      background_check_expiry: '2027-05-06',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: approvedVolunteer });

    const result = await volunteersApiClient.approveVolunteerBackgroundCheck(
      'volunteer-1',
      payload
    );

    expect(api.post).toHaveBeenCalledWith(
      '/v2/volunteers/volunteer-1/background-check/approve',
      payload
    );
    expect(result).toBe(approvedVolunteer);
  });
});
