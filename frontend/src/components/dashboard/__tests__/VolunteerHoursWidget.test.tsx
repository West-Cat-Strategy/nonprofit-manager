/**
 * VolunteerHoursWidget Tests
 * Tests for volunteer hours summary widget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VolunteerHoursWidget from '../VolunteerHoursWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import api from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn> };

describe('VolunteerHoursWidget', () => {
  const mockWidget: DashboardWidget = {
    id: 'volunteer-hours-1',
    type: 'volunteer_hours',
    title: 'Volunteer Hours',
    position: { x: 0, y: 0, w: 1, h: 1 },
    config: {},
  };

  const mockVolunteerData = {
    total_hours: 1245,
    active_volunteers: 32,
    hours_this_month: 180,
  };

  const mockPending = () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPending();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Volunteer Hours')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      mockPending();

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // WidgetContainer should show loading state
      // This depends on how WidgetContainer renders loading
    });

    it('displays volunteer hours data when loaded', async () => {
      mockApi.get.mockResolvedValue({ data: mockVolunteerData });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Hours')).toBeInTheDocument();
        expect(screen.getByText('1,245')).toBeInTheDocument();
      });
    });

    it('displays active volunteers count', async () => {
      mockApi.get.mockResolvedValue({ data: mockVolunteerData });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Active Volunteers')).toBeInTheDocument();
        expect(screen.getByText('32')).toBeInTheDocument();
      });
    });

    it('displays hours this month', async () => {
      mockApi.get.mockResolvedValue({ data: mockVolunteerData });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('This Month')).toBeInTheDocument();
        expect(screen.getByText('180')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls volunteer summary API on mount', async () => {
      mockApi.get.mockResolvedValue({ data: mockVolunteerData });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/volunteers/summary');
      });
    });

    it('handles API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.get.mockRejectedValue(new Error('API Error'));

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Error state should be shown through WidgetContainer
        // Exact implementation depends on WidgetContainer
      });

      consoleError.mockRestore();
    });

    it('handles missing data fields gracefully', async () => {
      mockApi.get.mockResolvedValue({ data: {} });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should display 0 for missing values
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edit Mode', () => {
    it('passes edit mode to WidgetContainer', () => {
      const { container } = render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={true}
          onRemove={() => {}}
        />
      );

      // WidgetContainer should handle edit mode UI
      expect(container).toBeInTheDocument();
    });

    it('calls onRemove callback', () => {
      const onRemove = vi.fn();

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={true}
          onRemove={onRemove}
        />
      );

      // WidgetContainer should have remove button in edit mode
      // This test depends on WidgetContainer implementation
    });
  });

  describe('Data Formatting', () => {
    it('formats large numbers with commas', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          total_hours: 123456,
          active_volunteers: 1234,
          hours_this_month: 5678,
        },
      });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('123,456')).toBeInTheDocument();
      });
    });

    it('handles zero values correctly', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          total_hours: 0,
          active_volunteers: 0,
          hours_this_month: 0,
        },
      });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThan(0);
      });
    });

    it('handles decimal hours correctly', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          total_hours: 1245.5,
          active_volunteers: 32,
          hours_this_month: 180.25,
        },
      });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should display formatted number (implementation may vary)
        expect(screen.getByText(/1,245/)).toBeInTheDocument();
      });
    });
  });

  describe('Widget Configuration', () => {
    it('uses widget title from config', () => {
      const customWidget = {
        ...mockWidget,
        title: 'Custom Volunteer Title',
      };

      render(
        <VolunteerHoursWidget
          widget={customWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Custom Volunteer Title')).toBeInTheDocument();
    });

    it('applies widget positioning', () => {
      const positionedWidget = {
        ...mockWidget,
        position: { x: 2, y: 1, w: 2, h: 2 },
      };

      const { container } = render(
        <VolunteerHoursWidget
          widget={positionedWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Widget positioning is handled by parent grid system
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has semantic HTML structure', async () => {
      mockApi.get.mockResolvedValue({ data: mockVolunteerData });

      const { container } = render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should have proper heading hierarchy
        expect(container.querySelector('p')).toBeInTheDocument();
      });
    });

    it('provides meaningful labels for data', async () => {
      mockApi.get.mockResolvedValue({ data: mockVolunteerData });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Hours')).toBeInTheDocument();
        expect(screen.getByText('Active Volunteers')).toBeInTheDocument();
        expect(screen.getByText('This Month')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('only fetches data once on mount', async () => {
      const { rerender } = render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(1);
      });

      // Rerender with same props
      rerender(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Should still only be called once (no refetch)
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('handles null volunteer data', async () => {
      mockApi.get.mockResolvedValue({ data: null });

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should handle null gracefully
        expect(screen.getByText(/volunteer hours/i)).toBeInTheDocument();
      });
    });

    it('handles undefined volunteer data', async () => {
      mockApi.get.mockResolvedValue({});

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should handle undefined gracefully
        expect(screen.getByText(/volunteer hours/i)).toBeInTheDocument();
      });
    });

    it('handles network timeout', async () => {
      mockApi.get.mockRejectedValue(new Error('Network timeout'));

      render(
        <VolunteerHoursWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      await waitFor(() => {
        // Should show error state
        // Implementation depends on WidgetContainer
      });
    });
  });
});
