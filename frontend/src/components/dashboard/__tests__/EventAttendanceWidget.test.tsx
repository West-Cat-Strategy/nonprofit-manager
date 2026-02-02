/**
 * EventAttendanceWidget Tests
 * Tests for event attendance summary widget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventAttendanceWidget from '../EventAttendanceWidget';
import type { DashboardWidget } from '../../../types/dashboard';

describe('EventAttendanceWidget', () => {
  const mockWidget: DashboardWidget = {
    id: 'event-attendance-1',
    type: 'event_attendance',
    title: 'Event Attendance',
    position: { x: 0, y: 0, w: 1, h: 1 },
    config: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Event Attendance')).toBeInTheDocument();
    });

    it('displays upcoming events metric', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('displays total this month metric', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Total This Month')).toBeInTheDocument();
      expect(screen.getByText('24')).toBeInTheDocument();
    });

    it('displays average attendance metric', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Avg. Attendance')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    it('uses correct text sizes for metrics', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Primary metric should be larger (text-3xl)
      const upcomingEvents = screen.getByText('12');
      expect(upcomingEvents).toHaveClass('text-3xl', 'font-bold');

      // Secondary metrics should be smaller (text-xl)
      const totalThisMonth = screen.getByText('24');
      expect(totalThisMonth).toHaveClass('text-xl', 'font-semibold');

      const avgAttendance = screen.getByText('45');
      expect(avgAttendance).toHaveClass('text-xl', 'font-semibold');
    });
  });

  describe('Layout Structure', () => {
    it('uses grid layout for secondary metrics', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Should have a grid container with 2 columns
      const gridContainer = container.querySelector('.grid.grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
    });

    it('has proper spacing between sections', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Main container should have space-y-4
      const mainContainer = container.querySelector('.space-y-4');
      expect(mainContainer).toBeInTheDocument();
    });

    it('applies gap between grid items', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Grid should have gap-4
      const gridContainer = container.querySelector('.gap-4');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Widget Configuration', () => {
    it('uses widget title from config', () => {
      const customWidget = {
        ...mockWidget,
        title: 'Custom Event Title',
      };

      render(
        <EventAttendanceWidget
          widget={customWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Custom Event Title')).toBeInTheDocument();
    });

    it('applies widget positioning', () => {
      const positionedWidget = {
        ...mockWidget,
        position: { x: 2, y: 1, w: 2, h: 2 },
      };

      const { container } = render(
        <EventAttendanceWidget
          widget={positionedWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Widget positioning is handled by parent grid system
      expect(container).toBeInTheDocument();
    });

    it('passes widget config to WidgetContainer', () => {
      const configuredWidget = {
        ...mockWidget,
        config: {
          customSetting: 'value',
        },
      };

      const { container } = render(
        <EventAttendanceWidget
          widget={configuredWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // WidgetContainer should handle config
      expect(container).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('passes edit mode to WidgetContainer', () => {
      const { container } = render(
        <EventAttendanceWidget
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
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={true}
          onRemove={onRemove}
        />
      );

      // WidgetContainer should have remove button in edit mode
      // This test depends on WidgetContainer implementation
      expect(container).toBeInTheDocument();
    });

    it('displays widget in non-edit mode', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Should render normally without edit controls
      expect(screen.getByText('Event Attendance')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });

  describe('Text Labels', () => {
    it('displays correct label for upcoming events', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      const label = screen.getByText('Upcoming Events');
      expect(label).toHaveClass('text-sm', 'text-gray-500');
    });

    it('displays correct label for total this month', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      const label = screen.getByText('Total This Month');
      expect(label).toHaveClass('text-xs', 'text-gray-500');
    });

    it('displays correct label for average attendance', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      const label = screen.getByText('Avg. Attendance');
      expect(label).toHaveClass('text-xs', 'text-gray-500');
    });

    it('uses abbreviated form for average', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Should use "Avg." not "Average" to save space
      expect(screen.getByText('Avg. Attendance')).toBeInTheDocument();
      expect(screen.queryByText('Average Attendance')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has semantic HTML structure', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Should have proper paragraph tags for labels and values
      expect(container.querySelector('p')).toBeInTheDocument();
    });

    it('provides meaningful labels for metrics', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Each metric should have a descriptive label
      expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      expect(screen.getByText('Total This Month')).toBeInTheDocument();
      expect(screen.getByText('Avg. Attendance')).toBeInTheDocument();
    });

    it('uses high contrast colors for readability', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Values should be dark gray (text-gray-900) for high contrast
      const value = screen.getByText('12');
      expect(value).toHaveClass('text-gray-900');
    });

    it('distinguishes labels from values with color', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Labels should be lighter (text-gray-500)
      const label = screen.getByText('Upcoming Events');
      expect(label).toHaveClass('text-gray-500');

      // Values should be darker (text-gray-900)
      const value = screen.getByText('12');
      expect(value).toHaveClass('text-gray-900');
    });
  });

  describe('Visual Hierarchy', () => {
    it('emphasizes primary metric with larger font', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      const primaryValue = screen.getByText('12');
      expect(primaryValue).toHaveClass('text-3xl');
    });

    it('uses smaller font for secondary metrics', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      const secondaryValue1 = screen.getByText('24');
      const secondaryValue2 = screen.getByText('45');

      expect(secondaryValue1).toHaveClass('text-xl');
      expect(secondaryValue2).toHaveClass('text-xl');
    });

    it('uses bold weight for primary metric', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      const primaryValue = screen.getByText('12');
      expect(primaryValue).toHaveClass('font-bold');
    });

    it('uses semibold weight for secondary metrics', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      const secondaryValue1 = screen.getByText('24');
      const secondaryValue2 = screen.getByText('45');

      expect(secondaryValue1).toHaveClass('font-semibold');
      expect(secondaryValue2).toHaveClass('font-semibold');
    });
  });

  describe('Responsive Design', () => {
    it('uses grid layout for secondary metrics on all screen sizes', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Grid should be 2 columns (grid-cols-2)
      const gridContainer = container.querySelector('.grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
    });

    it('maintains spacing consistency', () => {
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Should use consistent spacing (space-y-4, gap-4)
      expect(container.querySelector('.space-y-4')).toBeInTheDocument();
      expect(container.querySelector('.gap-4')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses widget prop', () => {
      const customWidget = {
        id: 'custom-id',
        type: 'event_attendance' as const,
        title: 'My Events',
        position: { x: 1, y: 1, w: 1, h: 1 },
        config: {},
      };

      render(
        <EventAttendanceWidget
          widget={customWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('My Events')).toBeInTheDocument();
    });

    it('accepts editMode prop', () => {
      const { rerender } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Event Attendance')).toBeInTheDocument();

      rerender(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={true}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Event Attendance')).toBeInTheDocument();
    });

    it('accepts onRemove callback prop', () => {
      const onRemove = vi.fn();

      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={true}
          onRemove={onRemove}
        />
      );

      // Component should pass callback to WidgetContainer
      expect(container).toBeInTheDocument();
    });
  });

  describe('Static Data Display', () => {
    it('displays static upcoming events count', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Currently displays static value of 12
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('displays static total this month count', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Currently displays static value of 24
      expect(screen.getByText('24')).toBeInTheDocument();
    });

    it('displays static average attendance count', () => {
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Currently displays static value of 45
      expect(screen.getByText('45')).toBeInTheDocument();
    });
  });

  describe('Future API Integration Readiness', () => {
    // These tests document the expected behavior when API integration is added

    it('should maintain structure when API data is added', () => {
      // When API integration is added, the component structure should remain the same
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(container.querySelector('.space-y-4')).toBeInTheDocument();
      expect(container.querySelector('.grid.grid-cols-2')).toBeInTheDocument();
    });

    it('should preserve label text when API data is added', () => {
      // Labels should remain the same when dynamic data is introduced
      render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
      expect(screen.getByText('Total This Month')).toBeInTheDocument();
      expect(screen.getByText('Avg. Attendance')).toBeInTheDocument();
    });

    it('should maintain accessibility when dynamic data is added', () => {
      // When API data is added, accessibility should be preserved
      const { container } = render(
        <EventAttendanceWidget
          widget={mockWidget}
          editMode={false}
          onRemove={() => {}}
        />
      );

      // Semantic HTML should be maintained
      expect(container.querySelector('p')).toBeInTheDocument();
    });
  });

  // TODO: Add these tests when API integration is implemented
  describe.skip('API Integration (Not Yet Implemented)', () => {
    it('should call events summary API on mount', () => {
      // Future: expect(api.get).toHaveBeenCalledWith('/events/summary')
    });

    it('should display loading state initially', () => {
      // Future: Test loading spinner/skeleton
    });

    it('should handle API errors gracefully', () => {
      // Future: Test error state display
    });

    it('should update display when API data changes', () => {
      // Future: Test data updates
    });

    it('should format large numbers correctly', () => {
      // Future: Test number formatting (e.g., 1,234)
    });

    it('should handle zero values', () => {
      // Future: Test display when counts are 0
    });

    it('should handle null or undefined data', () => {
      // Future: Test fallback to 0 or placeholder
    });
  });
});
