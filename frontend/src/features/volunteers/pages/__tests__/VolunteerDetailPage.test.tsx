import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VolunteerDetail from '../VolunteerDetailPage';
import { renderWithProviders } from '../../../../test/testUtils';
import { volunteersApiClient } from '../../api/volunteersApiClient';
import type { Volunteer } from '../../types/contracts';

const baseVolunteer: Volunteer = {
  volunteer_id: 'volunteer-1',
  contact_id: 'contact-1',
  first_name: 'Ada',
  last_name: 'Volunteer',
  email: 'ada@example.org',
  phone: '555-0101',
  skills: ['Screening'],
  availability_status: 'available',
  availability_notes: null,
  background_check_status: 'pending',
  background_check_date: null,
  background_check_expiry: null,
  background_check_approved_by: null,
  background_check_approved_at: null,
  background_check_approval_notes: null,
  preferred_roles: null,
  max_hours_per_week: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  volunteer_since: '2026-01-01T00:00:00.000Z',
  total_hours_logged: 0,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const buildVolunteerState = (volunteer: Volunteer) => ({
  volunteers: {
    core: {
      currentVolunteer: volunteer,
      loading: false,
      error: null,
    },
    list: {
      volunteers: [],
      loading: false,
      error: null,
      currentRequestId: null,
      pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
      filters: {
        search: '',
        skills: [],
        availability_status: '',
        background_check_status: '',
        is_active: true,
      },
    },
    assignments: {
      assignments: [],
      loading: false,
      error: null,
    },
  },
});

describe('VolunteerDetail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the dedicated endpoint when staff approve a background check', async () => {
    const approvedVolunteer: Volunteer = {
      ...baseVolunteer,
      background_check_status: 'approved',
      background_check_date: '2026-05-06',
      background_check_expiry: '2027-05-06',
      background_check_approved_by: 'staff-1',
      background_check_approved_at: '2026-05-06T17:00:00.000Z',
      background_check_approval_notes: 'Cleared after reviewing the vendor report.',
    };
    const approveSpy = vi
      .spyOn(volunteersApiClient, 'approveVolunteerBackgroundCheck')
      .mockResolvedValue(approvedVolunteer);

    renderWithProviders(<VolunteerDetail />, {
      preloadedState: buildVolunteerState(baseVolunteer),
    });

    fireEvent.change(screen.getByLabelText(/approval notes/i), {
      target: { value: 'Cleared after reviewing the vendor report.' },
    });
    fireEvent.change(screen.getByLabelText(/approval date/i), {
      target: { value: '2026-05-06' },
    });
    fireEvent.change(screen.getByLabelText(/expiry date/i), {
      target: { value: '2027-05-06' },
    });
    fireEvent.click(screen.getByRole('button', { name: /approve background check/i }));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith('volunteer-1', {
        notes: 'Cleared after reviewing the vendor report.',
        background_check_date: '2026-05-06',
        background_check_expiry: '2027-05-06',
      });
    });
  });
});
