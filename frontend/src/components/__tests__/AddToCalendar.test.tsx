import { vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddToCalendar from '../AddToCalendar';
import * as calendarUtils from '../../utils/calendar';
import { renderWithProviders } from '../../test/testUtils';

// Mock the calendar utility functions
vi.mock('../../utils/calendar', () => ({
  generateGoogleCalendarUrl: vi.fn((event) => `https://google.com/calendar?event=${event.event_id}`),
  generateOutlookCalendarUrl: vi.fn((event) => `HTTPS://outlook.com/calendar?event=${event.event_id}`),
  generateYahooCalendarUrl: vi.fn((event) => `HTTPS://yahoo.com/calendar?event=${event.event_id}`),
  getIcsDownloadUrl: vi.fn((eventId) => `/api/v2/events/${eventId}/calendar.ics`),
}));

describe('AddToCalendar', () => {
  const mockEvent = {
    event_id: 'event-123',
    event_name: 'Annual Fundraiser',
    description: 'Join us for our annual fundraising gala',
    start_date: '2024-06-15T18:00:00Z',
    end_date: '2024-06-15T22:00:00Z',
    location_name: 'Grand Ballroom',
    address_line1: '123 Main St',
    city: 'New York',
    state_province: 'NY',
    postal_code: '10001',
    country: 'USA',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the "Add to Calendar" button', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    expect(button).toBeInTheDocument();
  });

  it('should not show dropdown initially', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument();
    expect(screen.queryByText('Outlook')).not.toBeInTheDocument();
  });

  it('should open dropdown when button is clicked', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Outlook')).toBeInTheDocument();
    expect(screen.getByText('Yahoo Calendar')).toBeInTheDocument();
    expect(screen.getByText('Download .ics')).toBeInTheDocument();
  });

  it('should close dropdown when button is clicked again', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');

    // Open
    fireEvent.click(button);
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();

    // Close
    fireEvent.click(button);
    expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument();
  });

  it('should close dropdown when clicking outside', async () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    // Open dropdown
    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument();
    });
  });

  it('should not close dropdown when clicking inside', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    // Open dropdown
    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    // Click inside dropdown
    const dropdown = screen.getByText('Google Calendar').closest('div');
    if (dropdown) {
      fireEvent.mouseDown(dropdown);
    }

    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });

  it('should generate correct Google Calendar URL', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    const googleLink = screen.getByText('Google Calendar').closest('a');
    expect(googleLink).toHaveAttribute('href', `https://google.com/calendar?event=${mockEvent.event_id}`);
    expect(googleLink).toHaveAttribute('target', '_blank');
    expect(googleLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(calendarUtils.generateGoogleCalendarUrl).toHaveBeenCalledWith(mockEvent);
  });

  it('should generate correct Outlook Calendar URL', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    const outlookLink = screen.getByText('Outlook').closest('a');
    expect(outlookLink).toHaveAttribute('href', `HTTPS://outlook.com/calendar?event=${mockEvent.event_id}`);
    expect(outlookLink).toHaveAttribute('target', '_blank');

    expect(calendarUtils.generateOutlookCalendarUrl).toHaveBeenCalledWith(mockEvent);
  });

  it('should generate correct Yahoo Calendar URL', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    const yahooLink = screen.getByText('Yahoo Calendar').closest('a');
    expect(yahooLink).toHaveAttribute('href', `HTTPS://yahoo.com/calendar?event=${mockEvent.event_id}`);
    expect(yahooLink).toHaveAttribute('target', '_blank');

    expect(calendarUtils.generateYahooCalendarUrl).toHaveBeenCalledWith(mockEvent);
  });

  it('should generate correct ICS download URL', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    const icsLink = screen.getByText('Download .ics').closest('a');
    expect(icsLink).toHaveAttribute('href', `/api/v2/events/${mockEvent.event_id}/calendar.ics`);
    expect(icsLink).toHaveAttribute('target', '_self');
    expect(icsLink).not.toHaveAttribute('rel');

    expect(calendarUtils.getIcsDownloadUrl).toHaveBeenCalledWith(mockEvent.event_id);
  });

  it('should close dropdown when calendar option is clicked', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    const googleLink = screen.getByText('Google Calendar');
    fireEvent.click(googleLink);

    expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = renderWithProviders(<AddToCalendar event={mockEvent} className="custom-class" />);

    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('should render all calendar option icons', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    // Check that SVG icons are present (they all have className w-4 h-4)
    const dropdown = screen.getByText('Google Calendar').closest('div');
    const icons = dropdown?.querySelectorAll('svg.w-4.h-4');

    expect(icons).toHaveLength(4); // 4 calendar options with icons
  });

  it('should rotate chevron icon when dropdown is open', () => {
    const { container } = renderWithProviders(<AddToCalendar event={mockEvent} />);

    const chevron = container.querySelector('svg.w-4.h-4.transition-transform');

    // Initially not rotated
    expect(chevron).not.toHaveClass('rotate-180');

    // Open dropdown
    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    // Should be rotated
    expect(chevron).toHaveClass('rotate-180');

    // Close dropdown
    fireEvent.click(button);

    // Should not be rotated
    expect(chevron).not.toHaveClass('rotate-180');
  });

  it('should handle event with minimal data', () => {
    const minimalEvent = {
      event_id: 'min-event',
      event_name: 'Simple Event',
      start_date: '2024-01-01T10:00:00Z',
      end_date: '2024-01-01T11:00:00Z',
    };

    renderWithProviders(<AddToCalendar event={minimalEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(calendarUtils.generateGoogleCalendarUrl).toHaveBeenCalledWith(minimalEvent);
  });

  it('should handle event with null optional fields', () => {
    const eventWithNulls = {
      ...mockEvent,
      description: null,
      location_name: null,
      address_line1: null,
      city: null,
      state_province: null,
      postal_code: null,
      country: null,
    };

    renderWithProviders(<AddToCalendar event={eventWithNulls} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderWithProviders(<AddToCalendar event={mockEvent} />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('should be accessible with keyboard', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');

    // Should have focus styles
    expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-green-500');
  });

  it('should render dropdown with correct z-index for layering', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    const dropdown = screen.getByText('Google Calendar').closest('div');
    expect(dropdown).toHaveClass('z-50');
  });

  it('should position dropdown to the right', () => {
    renderWithProviders(<AddToCalendar event={mockEvent} />);

    const button = screen.getByText('Add to Calendar');
    fireEvent.click(button);

    const dropdown = screen.getByText('Google Calendar').closest('div');
    expect(dropdown).toHaveClass('right-0');
  });
});
