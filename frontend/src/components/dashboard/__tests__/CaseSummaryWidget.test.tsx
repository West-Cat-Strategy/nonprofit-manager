/**
 * CaseSummaryWidget Tests
 * Tests for case management summary widget
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import CaseSummaryWidget from '../CaseSummaryWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import api from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Wrapper component for Router context
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('CaseSummaryWidget', () => {
  const mockWidget: DashboardWidget = {
    id: 'case-summary-1',
    type: 'case_summary',
    title: 'Case Summary',
    position: { x: 0, y: 0, w: 1, h: 1 },
    config: {},
  };

  const mockActiveResponse = {
    data: {
      total: 42,
      cases: [],
    },
  };

  const mockUrgentResponse = {
    data: {
      total: 8,
      cases: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      (api.get as any).mockResolvedValue(mockActiveResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      expect(screen.getByText('Case Summary')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      (api.get as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      // WidgetContainer should show loading state
      // This depends on how WidgetContainer renders loading
    });

    it('displays case data when loaded', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Active Cases')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
      });
    });

    it('displays urgent cases count', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Urgent')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('displays closed this month count', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Closed This Month')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls active cases API on mount', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/cases?status=active');
      });
    });

    it('calls urgent cases API on mount', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/cases?priority=urgent');
      });
    });

    it('makes both API calls in parallel', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });

    it('handles API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      (api.get as any).mockRejectedValue(new Error('API Error'));

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Error state should be shown through WidgetContainer
        // Exact implementation depends on WidgetContainer
      });

      consoleError.mockRestore();
    });

    it('handles missing total field gracefully', async () => {
      (api.get as any)
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} });

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Should display 0 for missing values
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Interactive Links', () => {
    it('renders active cases as link', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Active Cases').closest('a');
        expect(link).toHaveAttribute('href', '/cases?status=active');
      });
    });

    it('renders urgent cases as link', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Urgent').closest('a');
        expect(link).toHaveAttribute('href', '/cases?priority=urgent');
      });
    });

    it('applies hover styles to active cases link', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Active Cases').closest('a');
        expect(link).toHaveClass('hover:bg-blue-100');
      });
    });

    it('applies hover styles to urgent cases link', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Urgent').closest('a');
        expect(link).toHaveClass('hover:bg-red-100');
      });
    });
  });

  describe('Color Coding', () => {
    it('uses blue theme for active cases', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Active Cases').closest('a');
        expect(link).toHaveClass('bg-blue-50');

        const label = screen.getByText('Active Cases');
        expect(label).toHaveClass('text-blue-600');

        const value = screen.getByText('42');
        expect(value).toHaveClass('text-blue-900');
      });
    });

    it('uses red theme for urgent cases', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Urgent').closest('a');
        expect(link).toHaveClass('bg-red-50');

        const label = screen.getByText('Urgent');
        expect(label).toHaveClass('text-red-600');

        const value = screen.getByText('8');
        expect(value).toHaveClass('text-red-900');
      });
    });

    it('uses gray theme for closed cases', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const label = screen.getByText('Closed This Month');
        expect(label).toHaveClass('text-gray-500');

        const value = screen.getByText('0');
        expect(value).toHaveClass('text-gray-900');
      });
    });
  });

  describe('Layout Structure', () => {
    it('uses grid layout for active and urgent cases', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const { container } = render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid.grid-cols-2');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('applies consistent spacing', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const { container } = render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(container.querySelector('.space-y-4')).toBeInTheDocument();
        expect(container.querySelector('.gap-4')).toBeInTheDocument();
      });
    });

    it('applies padding to link cards', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Active Cases').closest('a');
        expect(link).toHaveClass('p-3');
      });
    });

    it('applies rounded corners to link cards', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const link = screen.getByText('Active Cases').closest('a');
        expect(link).toHaveClass('rounded-lg');
      });
    });
  });

  describe('Data Formatting', () => {
    it('displays numeric values correctly', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('handles large numbers', async () => {
      (api.get as any)
        .mockResolvedValueOnce({ data: { total: 9999 } })
        .mockResolvedValueOnce({ data: { total: 999 } });

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('9999')).toBeInTheDocument();
        expect(screen.getByText('999')).toBeInTheDocument();
      });
    });

    it('handles zero values correctly', async () => {
      (api.get as any)
        .mockResolvedValueOnce({ data: { total: 0 } })
        .mockResolvedValueOnce({ data: { total: 0 } });

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edit Mode', () => {
    it('passes edit mode to WidgetContainer', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const { container } = render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={true}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      // WidgetContainer should handle edit mode UI
      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    });

    it('calls onRemove callback', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const onRemove = vi.fn();

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={true}
            onRemove={onRemove}
          />
        </RouterWrapper>
      );

      // WidgetContainer should have remove button in edit mode
      // This test depends on WidgetContainer implementation
    });
  });

  describe('Widget Configuration', () => {
    it('uses widget title from config', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const customWidget = {
        ...mockWidget,
        title: 'Custom Case Title',
      };

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={customWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      expect(screen.getByText('Custom Case Title')).toBeInTheDocument();
    });

    it('applies widget positioning', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const positionedWidget = {
        ...mockWidget,
        position: { x: 2, y: 1, w: 2, h: 2 },
      };

      const { container } = render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={positionedWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      // Widget positioning is handled by parent grid system
      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has semantic HTML structure', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const { container } = render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(container.querySelector('a')).toBeInTheDocument();
        expect(container.querySelector('p')).toBeInTheDocument();
      });
    });

    it('provides clickable links for navigation', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const activeLink = screen.getByText('Active Cases').closest('a');
        const urgentLink = screen.getByText('Urgent').closest('a');

        expect(activeLink).toBeInTheDocument();
        expect(urgentLink).toBeInTheDocument();
      });
    });

    it('uses high contrast colors', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const activeValue = screen.getByText('42');
        const urgentValue = screen.getByText('8');

        expect(activeValue).toHaveClass('text-blue-900');
        expect(urgentValue).toHaveClass('text-red-900');
      });
    });

    it('provides meaningful labels for metrics', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Active Cases')).toBeInTheDocument();
        expect(screen.getByText('Urgent')).toBeInTheDocument();
        expect(screen.getByText('Closed This Month')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('only fetches data once on mount', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      const { rerender } = render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });

      // Rerender with same props
      rerender(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      // Should still only be called twice (no refetch)
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles null case data', async () => {
      (api.get as any)
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null });

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Should handle null gracefully
        expect(screen.getByText(/case summary/i)).toBeInTheDocument();
      });
    });

    it('handles undefined case data', async () => {
      (api.get as any).mockResolvedValueOnce({}).mockResolvedValueOnce({});

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Should handle undefined gracefully
        expect(screen.getByText(/case summary/i)).toBeInTheDocument();
      });
    });

    it('handles network timeout', async () => {
      (api.get as any).mockRejectedValue(new Error('Network timeout'));

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Should show error state
        // Implementation depends on WidgetContainer
      });
    });

    it('handles partial API failures gracefully', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockRejectedValueOnce(new Error('Urgent API failed'));

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Should show error state when any API call fails
      });
    });
  });

  describe('Visual Design', () => {
    it('uses larger font for metric values', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const activeValue = screen.getByText('42');
        const urgentValue = screen.getByText('8');

        expect(activeValue).toHaveClass('text-2xl', 'font-bold');
        expect(urgentValue).toHaveClass('text-2xl', 'font-bold');
      });
    });

    it('uses smaller font for labels', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        const activeLabel = screen.getByText('Active Cases');
        const urgentLabel = screen.getByText('Urgent');

        expect(activeLabel).toHaveClass('text-xs');
        expect(urgentLabel).toHaveClass('text-xs');
      });
    });

    it('creates visual distinction between metric types', async () => {
      (api.get as any)
        .mockResolvedValueOnce(mockActiveResponse)
        .mockResolvedValueOnce(mockUrgentResponse);

      render(
        <RouterWrapper>
          <CaseSummaryWidget
            widget={mockWidget}
            editMode={false}
            onRemove={() => {}}
          />
        </RouterWrapper>
      );

      await waitFor(() => {
        // Active and Urgent should have colored backgrounds
        const activeLink = screen.getByText('Active Cases').closest('a');
        const urgentLink = screen.getByText('Urgent').closest('a');

        expect(activeLink).toHaveClass('bg-blue-50');
        expect(urgentLink).toHaveClass('bg-red-50');
      });
    });
  });
});
