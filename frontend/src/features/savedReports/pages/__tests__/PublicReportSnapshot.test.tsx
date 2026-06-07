import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PublicReportSnapshotPage from '../PublicReportSnapshotPage';
import { savedReportsApiClient } from '../../api/savedReportsApiClient';

const routeParams = vi.hoisted(() => ({ token: 'token-1' as string | undefined }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => (routeParams.token ? { token: routeParams.token } : {}),
    useLocation: () => ({ pathname: '/public/reports', search: '', hash: window.location.hash }),
  };
});

vi.mock('../../api/savedReportsApiClient', () => ({
  savedReportsApiClient: {
    fetchPublicReportMetadata: vi.fn(),
    downloadPublicReportSnapshot: vi.fn(),
  },
}));

const mockSavedReportsApi = savedReportsApiClient as unknown as {
  fetchPublicReportMetadata: ReturnType<typeof vi.fn>;
};

describe('PublicReportSnapshotPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeParams.token = 'token-1';
    window.history.replaceState(null, '', '/');
  });

  it('renders active metadata and download actions', async () => {
    mockSavedReportsApi.fetchPublicReportMetadata.mockResolvedValue({
      token: 'token-1',
      report_id: 'report-1',
      report_name: 'Monthly Donor Summary',
      entity: 'donations',
      rows_count: 42,
      lifecycle_state: 'active',
      expires_at: null,
      created_at: '2026-03-03T00:00:00.000Z',
      available_formats: ['csv', 'xlsx'],
    });

    render(<PublicReportSnapshotPage />);

    await waitFor(() => {
      expect(screen.getByText(/monthly donor summary/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /download csv/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /download xlsx/i })).toBeEnabled();
  });

  it('renders revoked lifecycle note', async () => {
    mockSavedReportsApi.fetchPublicReportMetadata.mockResolvedValue({
      token: 'token-1',
      report_id: 'report-1',
      report_name: 'Revoked Report',
      entity: 'contacts',
      rows_count: 0,
      lifecycle_state: 'revoked',
      expires_at: null,
      created_at: '2026-03-03T00:00:00.000Z',
      available_formats: [],
    });

    render(<PublicReportSnapshotPage />);

    await waitFor(() => {
      expect(screen.getByText(/this public link has been revoked/i)).toBeInTheDocument();
    });
  });

  it('renders load error', async () => {
    mockSavedReportsApi.fetchPublicReportMetadata.mockRejectedValue(new Error('Report not found'));

    render(<PublicReportSnapshotPage />);

    await waitFor(() => {
      expect(screen.getByText(/report not found/i)).toBeInTheDocument();
    });
  });

  it('reads fragment tokens and scrubs the visible URL', async () => {
    routeParams.token = undefined;
    window.history.replaceState(null, '', '/public/reports#fragment-token');
    mockSavedReportsApi.fetchPublicReportMetadata.mockResolvedValue({
      token: 'fragment-token',
      report_id: 'report-1',
      report_name: 'Fragment Report',
      entity: 'contacts',
      rows_count: 1,
      lifecycle_state: 'active',
      expires_at: null,
      created_at: '2026-03-03T00:00:00.000Z',
      available_formats: ['csv'],
    });

    render(<PublicReportSnapshotPage />);

    await waitFor(() => {
      expect(mockSavedReportsApi.fetchPublicReportMetadata).toHaveBeenCalledWith('fragment-token');
    });
    expect(window.location.hash).toBe('');
  });
});
