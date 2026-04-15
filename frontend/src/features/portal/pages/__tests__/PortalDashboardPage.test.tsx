import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalDashboardPage from '../PortalDashboardPage';

const getDashboardMock = vi.fn();
const setSelectedCaseIdMock = vi.fn();

vi.mock('../../api/portalApiClient', () => ({
  portalV2ApiClient: {
    getDashboard: (...args: unknown[]) => getDashboardMock(...args),
    getDocumentDownloadUrl: (id: string) => `/api/v2/portal/documents/${id}/download`,
  },
}));

vi.mock('../../../../hooks/usePersistentPortalCaseContext', () => ({
  usePersistentPortalCaseContext: () => ({
    setSelectedCaseId: setSelectedCaseIdMock,
  }),
}));

describe('PortalDashboardPage', () => {
  beforeEach(() => {
    getDashboardMock.mockResolvedValue({
      active_cases: [
        {
          id: 'case-1',
          case_number: 'CASE-001',
          title: 'Housing Support',
          description: 'Primary shared case',
          priority: 'high',
          status_name: 'Open',
          case_type_name: 'Housing',
          updated_at: '2026-03-15T18:00:00.000Z',
        },
      ],
      unread_threads_count: 2,
      recent_threads: [
        {
          id: 'thread-1',
          subject: 'Need help with paperwork',
          status: 'open',
          case_number: 'CASE-001',
          case_title: 'Housing Support',
          pointperson_first_name: 'Alex',
          pointperson_last_name: 'Rivera',
          unread_count: 2,
          last_message_at: '2026-03-15T17:00:00.000Z',
          last_message_preview: 'Please upload your intake forms.',
        },
      ],
      next_appointment: {
        id: 'appointment-1',
        title: 'Case check-in',
        start_time: '2026-03-16T18:00:00.000Z',
        end_time: '2026-03-16T19:00:00.000Z',
        status: 'confirmed',
        case_title: 'Housing Support',
        location: 'Main office',
      },
      upcoming_events: [
        {
          id: 'event-1',
          name: 'Client Orientation',
          series_id: 'series-1',
          occurrence_id: 'occurrence-1',
          occurrence_name: 'Orientation Session',
          occurrence_index: 1,
          occurrence_count: 3,
          start_date: '2026-03-17T18:00:00.000Z',
          end_date: '2026-03-17T20:00:00.000Z',
          registration_id: 'reg-1',
        },
      ],
      recent_documents: [
        {
          id: 'doc-1',
          original_name: 'welcome.pdf',
          document_type: 'report',
          title: 'Welcome Packet',
          description: 'Staff shared packet',
          created_at: '2026-03-15T16:00:00.000Z',
        },
      ],
      reminders: [
        {
          type: 'appointment',
          id: 'reminder-1',
          title: 'Case check-in',
          date: '2026-03-16T18:00:00.000Z',
        },
      ],
    });
  });

  it('renders dashboard sections and persists selected case when opening the workspace', async () => {
    renderWithProviders(<PortalDashboardPage />);

    expect(await screen.findByText('Resume A Shared Case')).toBeInTheDocument();
    expect(screen.getByText('Need help with paperwork')).toBeInTheDocument();
    expect(screen.getByText('Welcome Packet')).toBeInTheDocument();
    expect(screen.getByText('Client Orientation • Orientation Session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /resume case workspace/i }));

    await waitFor(() => {
      expect(setSelectedCaseIdMock).toHaveBeenCalledWith('case-1');
    });
  });
});
