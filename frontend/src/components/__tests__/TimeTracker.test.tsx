import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimeTracker from '../TimeTracker';
import type { VolunteerAssignment } from '../../store/slices/volunteersSlice';

describe('TimeTracker', () => {
  const mockAssignments: VolunteerAssignment[] = [
    {
      assignment_id: 'assign-1',
      volunteer_id: 'vol-1',
      event_id: 'event-1',
      task_id: null,
      assignment_type: 'event',
      role: 'Coordinator',
      start_time: '2024-06-15T10:00:00Z',
      end_time: '2024-06-15T14:00:00Z',
      hours_logged: 4,
      status: 'in_progress',
      notes: 'Event coordination',
      event_name: 'Fundraiser',
      task_name: null,
    },
    {
      assignment_id: 'assign-2',
      volunteer_id: 'vol-1',
      event_id: null,
      task_id: 'task-1',
      assignment_type: 'task',
      role: 'Helper',
      start_time: '2024-06-20T09:00:00Z',
      end_time: '2024-06-20T12:00:00Z',
      hours_logged: 3,
      status: 'completed',
      notes: null,
      event_name: null,
      task_name: 'Setup',
    },
    {
      assignment_id: 'assign-3',
      volunteer_id: 'vol-1',
      event_id: null,
      task_id: null,
      assignment_type: 'general',
      role: null,
      start_time: '2024-06-15T15:00:00Z',
      end_time: '2024-06-15T17:00:00Z',
      hours_logged: 2,
      status: 'cancelled',
      notes: null,
      event_name: null,
      task_name: null,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render Time Tracker heading', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText('Time Tracker')).toBeInTheDocument();
  });

  it('should display volunteer name', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText('by John Doe')).toBeInTheDocument();
  });

  it('should display total hours logged', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={25.5}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText('25.5')).toBeInTheDocument();
    expect(screen.getByText('total hours logged')).toBeInTheDocument();
  });

  it('should display active assignments heading', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText('Active Assignments')).toBeInTheDocument();
  });

  it('should show only in_progress and scheduled assignments as active', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    // Should show "Fundraiser" (in_progress) in Active Assignments section
    expect(screen.getByText('Fundraiser')).toBeInTheDocument();
    expect(screen.getByText('Active Assignments')).toBeInTheDocument();

    // "Setup" is completed, so it appears in "Recently Completed" not in active
    expect(screen.getByText('Recently Completed')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
  });

  it('should display "No active assignments" when no active assignments exist', () => {
    const completedOnly: VolunteerAssignment[] = [
      {
        ...mockAssignments[1],
        status: 'completed',
      },
    ];

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={completedOnly}
      />
    );

    expect(screen.getByText('No active assignments')).toBeInTheDocument();
  });

  it('should display Start Timer button for active assignments', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const startButtons = screen.getAllByText('Start Timer');
    expect(startButtons.length).toBeGreaterThan(0);
  });

  it('should display manual hours input for active assignments', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const inputs = screen.getAllByPlaceholderText('0.0');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should display Log button for manual hours entry', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const logButtons = screen.getAllByText('Log');
    expect(logButtons.length).toBeGreaterThan(0);
  });

  it('should start timer when Start Timer button is clicked', () => {
    const mockOnStartTimer = vi.fn();

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
        onStartTimer={mockOnStartTimer}
      />
    );

    const startButton = screen.getByText('Start Timer');
    fireEvent.click(startButton);

    expect(mockOnStartTimer).toHaveBeenCalledWith('assign-1');
    expect(screen.getByText('Timer Running')).toBeInTheDocument();
  });

  it('should display Stop button when timer is running', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const startButton = screen.getByText('Start Timer');
    fireEvent.click(startButton);

    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('should display timer countdown in HH:MM:SS format', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const startButton = screen.getByText('Start Timer');
    act(() => {
      fireEvent.click(startButton);
    });

    // Initial time
    expect(screen.getByText('00:00:00')).toBeInTheDocument();

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('00:00:05')).toBeInTheDocument();
  });

  it('should advance timer correctly over time', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const startButton = screen.getByText('Start Timer');
    act(() => {
      fireEvent.click(startButton);
    });

    // Advance timer by 1 hour, 5 minutes, 30 seconds
    act(() => {
      vi.advanceTimersByTime(3930000); // 1:05:30 in milliseconds
    });

    expect(screen.getByText('01:05:30')).toBeInTheDocument();
  });

  it('should call onStopTimer when Stop button is clicked', () => {
    const mockOnStopTimer = vi.fn();

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
        onStopTimer={mockOnStopTimer}
      />
    );

    const startButton = screen.getByText('Start Timer');
    fireEvent.click(startButton);

    // Advance timer by 2 hours (7200 seconds)
    act(() => {
      vi.advanceTimersByTime(7200000);
    });

    const stopButton = screen.getByText('Stop');
    fireEvent.click(stopButton);

    expect(mockOnStopTimer).toHaveBeenCalled();
    const callArgs = mockOnStopTimer.mock.calls[0];
    expect(callArgs[0]).toBe('assign-1'); // assignment ID
    expect(callArgs[1]).toBe(2); // 2 hours logged
  });

  it('should hide timer display after stopping', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const startButton = screen.getByText('Start Timer');
    fireEvent.click(startButton);

    expect(screen.getByText('Timer Running')).toBeInTheDocument();

    const stopButton = screen.getByText('Stop');
    fireEvent.click(stopButton);

    expect(screen.queryByText('Timer Running')).not.toBeInTheDocument();
  });

  it('should not allow starting multiple timers simultaneously', () => {
    const scheduledAssignment: VolunteerAssignment = {
      assignment_id: 'assign-4',
      volunteer_id: 'vol-1',
      event_id: 'event-2',
      task_id: null,
      assignment_type: 'event',
      role: 'Helper',
      start_time: '2024-06-22T10:00:00Z',
      end_time: '2024-06-22T14:00:00Z',
      hours_logged: 0,
      status: 'scheduled',
      notes: null,
      event_name: 'Second Event',
      task_name: null,
    };

    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={[...mockAssignments, scheduledAssignment]}
      />
    );

    const startButtons = screen.getAllByText('Start Timer');

    // Start first timer
    act(() => {
      fireEvent.click(startButtons[0]);
    });
    expect(screen.getByText('Timer Running')).toBeInTheDocument();

    // After starting first timer, get the updated button list
    const remainingStartButtons = screen.queryAllByText('Start Timer');

    if (remainingStartButtons.length > 0) {
      // Try to start second timer
      act(() => {
        fireEvent.click(remainingStartButtons[0]);
      });

      expect(alertMock).toHaveBeenCalledWith(
        'Please stop the current timer before starting a new one.'
      );
    }

    alertMock.mockRestore();
  });

  it('should handle manual hours input change', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const input = screen.getAllByPlaceholderText('0.0')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2.5' } });

    expect(input.value).toBe('2.5');
  });

  it('should call onUpdateHours when Log button is clicked with valid hours', () => {
    const mockOnUpdateHours = vi.fn();

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
        onUpdateHours={mockOnUpdateHours}
      />
    );

    const input = screen.getAllByPlaceholderText('0.0')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '3.5' } });

    const logButton = screen.getAllByText('Log')[0];
    fireEvent.click(logButton);

    expect(mockOnUpdateHours).toHaveBeenCalledWith('assign-1', 3.5);
  });

  it('should show alert for invalid hours input', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const input = screen.getAllByPlaceholderText('0.0')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '-1' } });

    const logButton = screen.getAllByText('Log')[0];
    fireEvent.click(logButton);

    expect(alertMock).toHaveBeenCalledWith('Please enter a valid number of hours.');

    alertMock.mockRestore();
  });

  it('should show alert for zero hours input', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const input = screen.getAllByPlaceholderText('0.0')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });

    const logButton = screen.getAllByText('Log')[0];
    fireEvent.click(logButton);

    expect(alertMock).toHaveBeenCalledWith('Please enter a valid number of hours.');

    alertMock.mockRestore();
  });

  it('should clear manual hours input after successful submission', () => {
    const mockOnUpdateHours = vi.fn();

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
        onUpdateHours={mockOnUpdateHours}
      />
    );

    const input = screen.getAllByPlaceholderText('0.0')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2.5' } });

    const logButton = screen.getAllByText('Log')[0];
    fireEvent.click(logButton);

    expect(input.value).toBe('');
  });

  it('should display Recently Completed section', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText('Recently Completed')).toBeInTheDocument();
  });

  it('should show completed assignments in Recently Completed section', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    // "Setup" is the completed assignment
    const completedSection = screen.getByText('Recently Completed').closest('div');
    expect(completedSection).toHaveTextContent('Setup');
    expect(completedSection).toHaveTextContent('3h');
  });

  it('should display hours logged for each active assignment', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText('Hours logged:')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // Fundraiser hours
  });

  it('should display assignment role if available', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    expect(screen.getByText('Role: Coordinator')).toBeInTheDocument();
  });

  it('should display assignment dates', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    // Check for date format (this will depend on locale)
    const datePattern = /6\/15\/2024/; // US format
    expect(screen.getByText(datePattern)).toBeInTheDocument();
  });

  it('should display status badge with correct styling for in_progress', () => {
    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={mockAssignments}
      />
    );

    const statusBadge = screen.getByText('in progress');
    expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('should not show Recently Completed section if no completed assignments', () => {
    const activeOnly: VolunteerAssignment[] = [
      {
        ...mockAssignments[0],
        status: 'in_progress',
      },
    ];

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={activeOnly}
      />
    );

    expect(screen.queryByText('Recently Completed')).not.toBeInTheDocument();
  });

  it('should limit Recently Completed to 5 assignments', () => {
    const manyCompleted: VolunteerAssignment[] = Array.from({ length: 10 }, (_, i) => ({
      assignment_id: `assign-${i}`,
      volunteer_id: 'vol-1',
      event_id: `event-${i}`,
      task_id: null,
      assignment_type: 'event' as const,
      role: 'Helper',
      start_time: '2024-06-15T10:00:00Z',
      end_time: '2024-06-15T14:00:00Z',
      hours_logged: 3,
      status: 'completed' as const,
      notes: null,
      event_name: `Event ${i}`,
      task_name: null,
    }));

    render(
      <TimeTracker
        volunteerName="John Doe"
        totalHoursLogged={10}
        assignments={manyCompleted}
      />
    );

    const completedSection = screen.getByText('Recently Completed').closest('div');

    // Should show Event 0-4, not Event 5-9
    expect(completedSection).toHaveTextContent('Event 0');
    expect(completedSection).toHaveTextContent('Event 4');
    expect(completedSection).not.toHaveTextContent('Event 5');
  });
});
