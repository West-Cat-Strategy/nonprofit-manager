import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlausibleStatsWidget from '../PlausibleStatsWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn> };

describe('PlausibleStatsWidget', () => {
  const mockWidget: DashboardWidget = {
    id: 'plausible-stats-1',
    type: 'plausible_stats',
    title: 'Plausible Stats',
    position: { x: 0, y: 0, w: 2, h: 2 },
    config: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders metrics from API data', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        results: {
          visitors: { value: 1234, change: 10.2 },
          pageviews: { value: 5678, change: 8.1 },
          bounce_rate: { value: 42, change: -1.5 },
          visit_duration: { value: 145, change: 2.5 },
        },
      },
    });

    render(<PlausibleStatsWidget widget={mockWidget} editMode={false} onRemove={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText('Total Pageviews')).toBeInTheDocument();
      expect(screen.getByText('5,678')).toBeInTheDocument();
      expect(screen.getByText('Avg. Visit Duration')).toBeInTheDocument();
      expect(screen.getByText('2:25')).toBeInTheDocument();
    });
  });

  it('shows error state and does not show fabricated values on API failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi.get.mockRejectedValue(new Error('API Error'));

    render(<PlausibleStatsWidget widget={mockWidget} editMode={false} onRemove={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Error: Unable to load analytics data')).toBeInTheDocument();
    });

    expect(screen.queryByText('1,234')).not.toBeInTheDocument();
    expect(screen.queryByText('Showing mock data.')).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
