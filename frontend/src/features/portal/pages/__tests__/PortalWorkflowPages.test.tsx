import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalMessagesPage from '../PortalMessagesPage';
import PortalAppointmentsPage from '../PortalAppointmentsPage';

const portalGetMock = vi.fn();
const setSelectedCaseIdMock = vi.fn();

vi.mock('../../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => portalGetMock(...args),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../../../../hooks/usePersistentPortalCaseContext', () => ({
  usePersistentPortalCaseContext: () => ({
    selectedCaseId: 'case-1',
    setSelectedCaseId: setSelectedCaseIdMock,
    clearSelectedCaseId: vi.fn(),
  }),
}));

vi.mock('../../../messaging/drafts', () => ({
  usePersistedMessageDraft: () => ({
    draft: '',
    setDraft: vi.fn(),
    clearDraft: vi.fn(),
  }),
}));

vi.mock('../../client/usePortalMessageThreads', () => ({
  default: () => ({
    threads: [
      {
        id: 'thread-1',
        subject: 'Need help with documents',
        status: 'open',
        case_number: 'CASE-001',
        case_title: 'Housing Support',
        pointperson_first_name: 'Alex',
        pointperson_last_name: 'Rivera',
        unread_count: 1,
        last_message_at: '2026-03-15T18:00:00.000Z',
        last_message_preview: 'Please upload your documents here.',
      },
    ],
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    streamStatus: 'connected',
    refresh: vi.fn().mockResolvedValue(undefined),
    loadMore: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../client/usePortalAppointments', () => ({
  default: () => ({
    appointments: [
      {
        id: 'appointment-1',
        title: 'Case check-in',
        description: 'Bring intake papers',
        start_time: '2026-03-16T18:00:00.000Z',
        status: 'confirmed',
        location: 'Main office',
        case_number: 'CASE-001',
        request_type: 'manual_request',
      },
    ],
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null,
    streamStatus: 'connected',
    refresh: vi.fn().mockResolvedValue(undefined),
    loadMore: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

describe('Portal workflow pages', () => {
  beforeEach(() => {
    portalGetMock.mockImplementation((url: string) => {
      if (url === '/v2/portal/pointperson/context') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              default_case_id: 'case-1',
              selected_case_id: 'case-1',
              cases: [
                {
                  case_id: 'case-1',
                  case_number: 'CASE-001',
                  case_title: 'Housing Support',
                  assigned_to: 'staff-1',
                  pointperson_first_name: 'Alex',
                  pointperson_last_name: 'Rivera',
                  is_messageable: true,
                  is_default: true,
                },
              ],
            },
          },
        });
      }

      if (url === '/v2/portal/appointments/slots') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              selected_case_id: 'case-1',
              selected_pointperson_user_id: 'staff-1',
              slots: [
                {
                  id: 'slot-1',
                  title: 'Morning slot',
                  details: 'Bring documents',
                  location: 'Main office',
                  start_time: '2026-03-16T18:00:00.000Z',
                  end_time: '2026-03-16T19:00:00.000Z',
                  available_count: 1,
                  status: 'open',
                  case_number: 'CASE-001',
                  pointperson_first_name: 'Alex',
                  pointperson_last_name: 'Rivera',
                },
              ],
            },
          },
        });
      }

      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  it('renders the portal messages workflow shell', async () => {
    renderWithProviders(<PortalMessagesPage />);

    expect(await screen.findByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Need help with documents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('renders the portal appointments workflow shell', async () => {
    renderWithProviders(<PortalAppointmentsPage />);

    expect(await screen.findByText('Morning slot')).toBeInTheDocument();
    expect(screen.getByText('Case check-in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request appointment/i })).toBeInTheDocument();
  });
});
