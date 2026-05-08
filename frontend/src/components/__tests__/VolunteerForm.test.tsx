import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { VolunteerForm } from '../VolunteerForm';
import { renderWithProviders, createTestStore } from '../../test/testUtils';
import { volunteersApiClient } from '../../features/volunteers/api/volunteersApiClient';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderVolunteerForm = (component: React.ReactElement) => {
  const store = createTestStore();
  return renderWithProviders(component, { store });
};

describe('VolunteerForm', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Create Mode', () => {
    it('renders all required form fields', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      expect(screen.getByLabelText(/select contact/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/availability status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^skills$/i)).toBeInTheDocument();
    });

    it('shows Create Volunteer button', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);
      expect(screen.getByRole('button', { name: /create volunteer/i })).toBeInTheDocument();
    });

    it('has default availability status as available', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const statusSelect = screen.getByLabelText(/availability status/i) as HTMLSelectElement;
      expect(statusSelect.value).toBe('available');
    });

    it('allows adding skills by typing and pressing Enter', async () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const skillsInput = screen.getByLabelText(/^skills$/i) as HTMLInputElement;
      fireEvent.change(skillsInput, { target: { value: 'Programming' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Programming')).toBeInTheDocument();
      });
    });

    it('clears skill input after adding', async () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const skillsInput = screen.getByLabelText(/^skills$/i) as HTMLInputElement;
      fireEvent.change(skillsInput, { target: { value: 'Design' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(skillsInput.value).toBe('');
      });
    });

    it('allows removing skills', async () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const skillsInput = screen.getByLabelText(/^skills$/i) as HTMLInputElement;
      fireEvent.change(skillsInput, { target: { value: 'Marketing' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Marketing')).toBeInTheDocument();
      });

      // Find and click the remove button for Marketing skill
      const removeButtons = screen.getAllByRole('button');
      const marketingRemoveBtn = removeButtons.find(
        (btn) => btn.textContent?.includes('×') && btn.closest('span')?.textContent?.includes('Marketing')
      );
      if (marketingRemoveBtn) {
        fireEvent.click(marketingRemoveBtn);
      }

      await waitFor(() => {
        expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
      });
    });

    it('has cancel button that navigates back', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/volunteers');
    });
  });

  describe('Edit Mode', () => {
    const mockVolunteer = {
      volunteer_id: '789',
      contact_id: '456',
      skills: ['Teaching', 'Event Planning'],
      availability_status: 'available' as const,
      availability_notes: 'Weekends only',
      background_check_status: 'approved' as const,
      background_check_date: '2026-01-15',
      emergency_contact_name: 'Bob Smith',
      emergency_contact_phone: '555-0300',
      is_active: true,
    };

    it('shows Update Volunteer button in edit mode', () => {
      renderVolunteerForm(<VolunteerForm mode="edit" volunteer={mockVolunteer} />);
      expect(screen.getByRole('button', { name: /update volunteer/i })).toBeInTheDocument();
    });

    it('populates form fields with volunteer data', () => {
      renderVolunteerForm(<VolunteerForm mode="edit" volunteer={mockVolunteer} />);

      const statusSelect = screen.getByLabelText(/availability status/i) as HTMLSelectElement;
      expect(statusSelect.value).toBe('available');

      expect(screen.getByText('Teaching')).toBeInTheDocument();
      expect(screen.getByText('Event Planning')).toBeInTheDocument();
    });

    it('shows existing skills as tags', () => {
      renderVolunteerForm(<VolunteerForm mode="edit" volunteer={mockVolunteer} />);

      expect(screen.getByText('Teaching')).toBeInTheDocument();
      expect(screen.getByText('Event Planning')).toBeInTheDocument();
    });

    it('allows adding new skills to existing list', async () => {
      renderVolunteerForm(<VolunteerForm mode="edit" volunteer={mockVolunteer} />);

      const skillsInput = screen.getByLabelText(/^skills$/i) as HTMLInputElement;
      fireEvent.change(skillsInput, { target: { value: 'Photography' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Photography')).toBeInTheDocument();
        expect(screen.getByText('Teaching')).toBeInTheDocument();
      });
    });

    it('omits an existing approved background check from generic edit submissions', async () => {
      const updatedVolunteer = {
        ...mockVolunteer,
        background_check_expiry: null,
        background_check_approved_by: 'staff-1',
        background_check_approved_at: '2026-01-15T12:00:00.000Z',
        background_check_approval_notes: 'Cleared by prior approval.',
        preferred_roles: null,
        max_hours_per_week: null,
        emergency_contact_relationship: null,
        volunteer_since: '2026-01-15',
        total_hours_logged: 0,
        created_at: '2026-01-15T12:00:00.000Z',
        updated_at: '2026-01-15T12:00:00.000Z',
      } as Awaited<ReturnType<typeof volunteersApiClient.updateVolunteer>>;
      const updateVolunteerSpy = vi
        .spyOn(volunteersApiClient, 'updateVolunteer')
        .mockResolvedValue(updatedVolunteer);

      renderVolunteerForm(<VolunteerForm mode="edit" volunteer={mockVolunteer} />);
      fireEvent.click(screen.getByRole('button', { name: /update volunteer/i }));

      await waitFor(() => {
        expect(updateVolunteerSpy).toHaveBeenCalled();
      });
      expect(updateVolunteerSpy.mock.calls[0][1]).not.toHaveProperty(
        'background_check_status'
      );
    });
  });

  describe('Availability Status Selection', () => {
    it('allows selecting available status', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const statusSelect = screen.getByLabelText(/availability status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'available' } });
      expect(statusSelect.value).toBe('available');
    });

    it('allows selecting unavailable status', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const statusSelect = screen.getByLabelText(/availability status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'unavailable' } });
      expect(statusSelect.value).toBe('unavailable');
    });

    it('allows selecting limited status', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const statusSelect = screen.getByLabelText(/availability status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'limited' } });
      expect(statusSelect.value).toBe('limited');
    });
  });

  describe('Background Check', () => {
    it('allows selecting non-approved background check status only', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const bgCheckSelect = screen.getByLabelText(/background check status/i) as HTMLSelectElement;
      const optionValues = Array.from(bgCheckSelect.options).map((option) => option.value);

      expect(optionValues).not.toContain('approved');
      fireEvent.change(bgCheckSelect, { target: { value: 'in_progress' } });
      expect(bgCheckSelect.value).toBe('in_progress');
    });

    it('allows entering background check date', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const bgCheckDate = screen.getByLabelText(/background check date/i) as HTMLInputElement;
      fireEvent.change(bgCheckDate, { target: { value: '2026-02-01' } });
      expect(bgCheckDate.value).toBe('2026-02-01');
    });
  });

  describe('Emergency Contact', () => {
    it('allows entering emergency contact name', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      // The label says "Name" but the id is emergency_contact_name
      const emergencyName = document.getElementById('emergency_contact_name') as HTMLInputElement;
      fireEvent.change(emergencyName, { target: { value: 'Alice Johnson' } });
      expect(emergencyName.value).toBe('Alice Johnson');
    });

    it('allows entering emergency contact phone', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      // The label says "Phone" but the id is emergency_contact_phone
      const emergencyPhone = document.getElementById(
        'emergency_contact_phone'
      ) as HTMLInputElement;
      fireEvent.change(emergencyPhone, { target: { value: '555-0400' } });
      expect(emergencyPhone.value).toBe('555-0400');
    });
  });

  describe('Availability Notes', () => {
    it('allows entering availability notes', () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const availabilityInput = screen.getByLabelText(/availability notes/i) as HTMLTextAreaElement;
      fireEvent.change(availabilityInput, { target: { value: 'Weekdays after 5pm' } });
      expect(availabilityInput.value).toBe('Weekdays after 5pm');
    });
  });

  describe('Skills Management', () => {
    it('prevents adding duplicate skills', async () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const skillsInput = screen.getByLabelText(/^skills$/i) as HTMLInputElement;

      fireEvent.change(skillsInput, { target: { value: 'Cooking' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Cooking')).toBeInTheDocument();
      });

      fireEvent.change(skillsInput, { target: { value: 'Cooking' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      const cookingTags = screen.getAllByText('Cooking');
      expect(cookingTags).toHaveLength(1);
    });

    it('trims whitespace from skill names', async () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const skillsInput = screen.getByLabelText(/^skills$/i) as HTMLInputElement;
      fireEvent.change(skillsInput, { target: { value: '  Fundraising  ' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Fundraising')).toBeInTheDocument();
      });
    });

    it('does not add empty skills', async () => {
      renderVolunteerForm(<VolunteerForm mode="create" />);

      const skillsInput = screen.getByLabelText(/^skills$/i) as HTMLInputElement;
      fireEvent.change(skillsInput, { target: { value: '   ' } });
      fireEvent.keyDown(skillsInput, { key: 'Enter', code: 'Enter' });

      // The skills list should remain empty
      await waitFor(() => {
        // Look for skill tags (which have × in them)
        const spanElements = document.querySelectorAll('span.inline-flex');
        // Filter to only those that contain skill text (not empty ones)
        const skillSpans = Array.from(spanElements).filter(
          (span) => span.querySelector('button')
        );
        expect(skillSpans.length).toBe(0);
      });
    });
  });
});
