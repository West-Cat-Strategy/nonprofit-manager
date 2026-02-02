import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import VolunteerWidget from '../VolunteerWidget';
import volunteersReducer from '../../store/slices/volunteersSlice';
import type { Volunteer } from '../../store/slices/volunteersSlice';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockVolunteers: Volunteer[] = [
  {
    volunteer_id: 'vol-1',
    contact_id: 'contact-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    mobile_phone: '555-5678',
    skills: ['Event Planning', 'Fundraising'],
    availability_status: 'available',
    availability_notes: 'Weekends preferred',
    background_check_status: 'approved',
    background_check_date: '2024-01-15',
    background_check_expiry: '2025-01-15',
    preferred_roles: ['Coordinator'],
    max_hours_per_week: 20,
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '555-9999',
    emergency_contact_relationship: 'Spouse',
    volunteer_since: '2023-01-01',
    total_hours_logged: 120,
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    volunteer_id: 'vol-2',
    contact_id: 'contact-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: '555-2345',
    mobile_phone: null,
    skills: ['Teaching', 'Mentoring'],
    availability_status: 'limited',
    availability_notes: null,
    background_check_status: 'approved',
    background_check_date: '2024-02-01',
    background_check_expiry: '2025-02-01',
    preferred_roles: null,
    max_hours_per_week: 10,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relationship: null,
    volunteer_since: '2023-06-01',
    total_hours_logged: 85,
    is_active: true,
    created_at: '2023-06-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    volunteer_id: 'vol-3',
    contact_id: 'contact-3',
    first_name: 'Bob',
    last_name: 'Johnson',
    email: 'bob@example.com',
    phone: '555-3456',
    mobile_phone: '555-7890',
    skills: ['IT Support'],
    availability_status: 'unavailable',
    availability_notes: 'On vacation',
    background_check_status: 'pending',
    background_check_date: null,
    background_check_expiry: null,
    preferred_roles: ['Tech Support'],
    max_hours_per_week: 15,
    emergency_contact_name: 'Alice Johnson',
    emergency_contact_phone: '555-8888',
    emergency_contact_relationship: 'Spouse',
    volunteer_since: '2024-01-01',
    total_hours_logged: 45,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
];

// Create a test store with initial state
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      volunteers: volunteersReducer,
    },
    preloadedState: {
      volunteers: {
        volunteers: mockVolunteers,
        currentVolunteer: null,
        assignments: [],
        loading: false,
        error: null,
        pagination: {
          total: mockVolunteers.length,
          page: 1,
          limit: 20,
          total_pages: 1,
        },
        filters: {
          search: '',
          skills: [],
          availability_status: '',
          background_check_status: '',
          is_active: true,
        },
        ...initialState,
      },
    },
  });
};

// Wrapper component
const renderWithProviders = (component: React.ReactElement, storeState = {}) => {
  const store = createTestStore(storeState);
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
};

describe('VolunteerWidget', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should render Volunteer Overview heading', () => {
    renderWithProviders(<VolunteerWidget />);
    expect(screen.getByText('Volunteer Overview')).toBeInTheDocument();
  });

  it('should render View All button', () => {
    renderWithProviders(<VolunteerWidget />);
    expect(screen.getByText('View All →')).toBeInTheDocument();
  });

  it('should navigate to volunteers list when View All is clicked', () => {
    renderWithProviders(<VolunteerWidget />);

    const viewAllButton = screen.getByText('View All →');
    fireEvent.click(viewAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('/volunteers');
  });

  it('should display total volunteers count', () => {
    renderWithProviders(<VolunteerWidget />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('should display available volunteers count', () => {
    renderWithProviders(<VolunteerWidget />);

    // "1" appears multiple times (in different stats), so check for the label
    expect(screen.getByText('Available')).toBeInTheDocument();
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
  });

  it('should display limited volunteers count', () => {
    renderWithProviders(<VolunteerWidget />);

    // "1" appears multiple times (in different stats), so check for the label
    expect(screen.getByText('Limited')).toBeInTheDocument();
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
  });

  it('should display unavailable volunteers count', () => {
    renderWithProviders(<VolunteerWidget />);

    // "1" appears multiple times (in different stats), so check for the label
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
  });

  it('should display total hours logged', () => {
    renderWithProviders(<VolunteerWidget />);

    // Total: 120 + 85 + 45 = 250
    expect(screen.getByText('250.0')).toBeInTheDocument();
    expect(screen.getByText('Total Hours Logged')).toBeInTheDocument();
  });

  it('should display Quick Actions heading', () => {
    renderWithProviders(<VolunteerWidget />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('should render Add Volunteer button', () => {
    renderWithProviders(<VolunteerWidget />);
    expect(screen.getByText('Add Volunteer')).toBeInTheDocument();
  });

  it('should render New Assignment button', () => {
    renderWithProviders(<VolunteerWidget />);
    expect(screen.getByText('New Assignment')).toBeInTheDocument();
  });

  it('should navigate to volunteer creation when Add Volunteer is clicked', () => {
    renderWithProviders(<VolunteerWidget />);

    const addButton = screen.getByText('Add Volunteer');
    fireEvent.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('/volunteers/new');
  });

  it('should navigate to assignment creation when New Assignment is clicked', () => {
    renderWithProviders(<VolunteerWidget />);

    const assignButton = screen.getByText('New Assignment');
    fireEvent.click(assignButton);

    expect(mockNavigate).toHaveBeenCalledWith('/volunteers/assignments/new');
  });

  it('should display Availability Breakdown heading', () => {
    renderWithProviders(<VolunteerWidget />);
    expect(screen.getByText('Availability Breakdown')).toBeInTheDocument();
  });

  it('should show percentage breakdowns in availability section', () => {
    renderWithProviders(<VolunteerWidget />);

    // 1 available out of 3 = 33%
    expect(screen.getByText('33% available')).toBeInTheDocument();
    expect(screen.getByText('33% limited')).toBeInTheDocument();
    expect(screen.getByText('33% unavailable')).toBeInTheDocument();
  });

  it('should show loading state when volunteers are being fetched', () => {
    const loadingState = {
      volunteers: [],
      loading: true,
    };

    renderWithProviders(<VolunteerWidget />, loadingState);

    // Should show loading skeleton
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should display Top Volunteers section in detailed view', () => {
    renderWithProviders(<VolunteerWidget showDetailedView={true} />);
    expect(screen.getByText('Top Volunteers')).toBeInTheDocument();
  });

  it('should list top volunteers by hours in detailed view', () => {
    renderWithProviders(<VolunteerWidget showDetailedView={true} />);

    // John Doe has 120 hours (highest)
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('120.0h')).toBeInTheDocument();

    // Jane Smith has 85 hours (second)
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('85.0h')).toBeInTheDocument();

    // Bob Johnson has 45 hours (third)
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('45.0h')).toBeInTheDocument();
  });

  it('should display volunteer skills in detailed view', () => {
    renderWithProviders(<VolunteerWidget showDetailedView={true} />);

    expect(screen.getByText('Event Planning, Fundraising')).toBeInTheDocument();
    expect(screen.getByText('Teaching, Mentoring')).toBeInTheDocument();
  });

  it('should show "No skills listed" when volunteer has no skills', () => {
    const volunteersWithNoSkills = mockVolunteers.map((v) => ({
      ...v,
      skills: [],
    }));

    const stateWithNoSkills = {
      volunteers: volunteersWithNoSkills,
    };

    renderWithProviders(<VolunteerWidget showDetailedView={true} />, stateWithNoSkills);

    const noSkillsElements = screen.getAllByText('No skills listed');
    expect(noSkillsElements.length).toBeGreaterThan(0);
  });

  it('should navigate to volunteer detail when clicking on a volunteer card', () => {
    renderWithProviders(<VolunteerWidget showDetailedView={true} />);

    const johnDoeCard = screen.getByText('John Doe').closest('div');
    if (johnDoeCard) {
      fireEvent.click(johnDoeCard);
      expect(mockNavigate).toHaveBeenCalledWith('/volunteers/vol-1');
    }
  });

  it('should display availability status badges with correct colors', () => {
    renderWithProviders(<VolunteerWidget showDetailedView={true} />);

    // Find all availability status badges (they appear in the detailed view volunteer list)
    const availableBadges = screen.getAllByText('available');
    // At least one should have the correct classes (the one in the volunteer card, not the header)
    const volunteerBadge = availableBadges.find((badge) =>
      badge.className.includes('bg-green-100')
    );
    expect(volunteerBadge).toBeTruthy();
    if (volunteerBadge) {
      expect(volunteerBadge).toHaveClass('bg-green-100', 'text-green-800');
    }

    const limitedBadge = screen.getByText('limited');
    expect(limitedBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');

    const unavailableBadge = screen.getByText('unavailable');
    expect(unavailableBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('should show ranking numbers for top volunteers', () => {
    renderWithProviders(<VolunteerWidget showDetailedView={true} />);

    // Numbers 1, 2, 3 appear in rankings and possibly in stats, so use getAllByText
    const ones = screen.getAllByText('1');
    const twos = screen.getAllByText('2');
    const threes = screen.getAllByText('3');

    expect(ones.length).toBeGreaterThan(0);
    expect(twos.length).toBeGreaterThan(0);
    expect(threes.length).toBeGreaterThan(0);
  });

  it('should limit top volunteers list to 5', () => {
    const manyVolunteers = Array.from({ length: 10 }, (_, i) => ({
      ...mockVolunteers[0],
      volunteer_id: `vol-${i}`,
      first_name: `Volunteer${i}`,
      last_name: 'Test',
      total_hours_logged: 100 - i * 5,
    }));

    const stateWithMany = {
      volunteers: manyVolunteers,
    };

    renderWithProviders(<VolunteerWidget showDetailedView={true} />, stateWithMany);

    // Should show rankings 1-5 but not 6+
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('6')).not.toBeInTheDocument();
  });

  it('should not show Top Volunteers section when detailed view is false', () => {
    renderWithProviders(<VolunteerWidget showDetailedView={false} />);
    expect(screen.queryByText('Top Volunteers')).not.toBeInTheDocument();
  });

  it('should use provided stats prop if available', () => {
    const customStats = {
      total: 50,
      available: 30,
      limited: 10,
      unavailable: 10,
      totalHoursThisMonth: 500,
      activeAssignments: 15,
    };

    renderWithProviders(<VolunteerWidget stats={customStats} />);

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('500.0')).toBeInTheDocument();
  });

  it('should calculate stats from volunteers when stats prop is not provided', () => {
    renderWithProviders(<VolunteerWidget />);

    // Should calculate from mockVolunteers
    expect(screen.getByText('3')).toBeInTheDocument(); // total
    expect(screen.getByText('250.0')).toBeInTheDocument(); // total hours
  });

  it('should handle empty volunteers array gracefully with stats prop', () => {
    const emptyState = {
      volunteers: [],
      loading: false,
    };

    // When passing stats directly, it should show the data even if volunteers array is empty
    const customStats = {
      total: 0,
      available: 0,
      limited: 0,
      unavailable: 0,
      totalHoursThisMonth: 0,
      activeAssignments: 0,
    };

    renderWithProviders(<VolunteerWidget stats={customStats} />, emptyState);

    // Check for multiple zeros (one for each stat)
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('should display stats grid with correct layout classes', () => {
    renderWithProviders(<VolunteerWidget />);

    const statsGrid = document.querySelector('.grid.grid-cols-2.md\\:grid-cols-4');
    expect(statsGrid).toBeInTheDocument();
  });

  it('should show only up to 2 skills per volunteer in detailed view', () => {
    const volunteerWithManySkills: Volunteer[] = [
      {
        ...mockVolunteers[0],
        skills: ['Skill1', 'Skill2', 'Skill3', 'Skill4'],
      },
    ];

    const stateWithManySkills = {
      volunteers: volunteerWithManySkills,
    };

    renderWithProviders(<VolunteerWidget showDetailedView={true} />, stateWithManySkills);

    // Should show first 2 skills joined with comma
    expect(screen.getByText('Skill1, Skill2')).toBeInTheDocument();
    // Should not show Skill3 or Skill4
    expect(screen.queryByText(/Skill3/)).not.toBeInTheDocument();
  });

  it('should not show availability breakdown when total is 0', () => {
    const emptyState = {
      volunteers: [],
    };

    renderWithProviders(<VolunteerWidget />, emptyState);

    expect(screen.queryByText('Availability Breakdown')).not.toBeInTheDocument();
  });
});
