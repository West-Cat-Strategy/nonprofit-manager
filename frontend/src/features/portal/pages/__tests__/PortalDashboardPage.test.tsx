import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import type { PortalDashboardActionItem, PortalDashboardData } from '../../types/contracts';
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

const makeActionItem = (
  overrides: Partial<PortalDashboardActionItem> = {}
): PortalDashboardActionItem => ({
  id: 'form:assignment-1',
  kind: 'form',
  priority: 'urgent',
  title: 'Update Housing Intake',
  description: 'Please add the missing signature.',
  href: '/portal/forms?assignment=assignment-1',
  case_id: 'case-1',
  due_at: '2026-03-16T18:00:00.000Z',
  status: 'revision_requested',
  created_at: '2026-03-15T18:00:00.000Z',
  ...overrides,
});

const makeDashboard = (overrides: Partial<PortalDashboardData> = {}): PortalDashboardData => ({
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
  recent_activity: [],
  action_items: [makeActionItem()],
  ...overrides,
});

const makeActionOnlyDashboard = (
  actionItems: PortalDashboardActionItem[]
): PortalDashboardData =>
  makeDashboard({
    active_cases: [],
    unread_threads_count: 0,
    recent_threads: [],
    next_appointment: null,
    upcoming_events: [],
    recent_documents: [],
    reminders: [],
    recent_activity: [],
    action_items: actionItems,
  });

const getNeedsAttentionSection = async () => {
  const heading = await screen.findByRole('heading', { name: 'Needs Attention' });
  const section = heading.closest('section');
  if (!section) throw new Error('Needs Attention section was not rendered');
  return within(section);
};

describe('PortalDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDashboardMock.mockResolvedValue(makeDashboard());
  });

  it('renders dashboard sections and persists selected case when opening a case', async () => {
    renderWithProviders(<PortalDashboardPage />);

    expect(await screen.findByText('Resume A Shared Case')).toBeInTheDocument();
    expect(screen.getByText('Need help with paperwork')).toBeInTheDocument();
    expect(screen.getByText('Welcome Packet')).toBeInTheDocument();
    expect(screen.getByText('Client Orientation • Orientation Session')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('link', { name: /open case/i })[0]);

    await waitFor(() => {
      expect(setSelectedCaseIdMock).toHaveBeenCalledWith('case-1');
    });
  });

  it('surfaces action items before general dashboard cards', async () => {
    renderWithProviders(<PortalDashboardPage />);

    expect(await screen.findByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Update Housing Intake')).toBeInTheDocument();
    expect(screen.getByText('Please add the missing signature.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /update housing intake/i })).toHaveAttribute(
      'href',
      '/portal/forms?assignment=assignment-1'
    );
    expect(screen.getByRole('link', { name: /assigned forms/i })).toHaveAttribute('href', '/portal/forms');
  });

  it('does not show the page empty state for an action-only dashboard', async () => {
    getDashboardMock.mockResolvedValue(makeActionOnlyDashboard([makeActionItem()]));

    renderWithProviders(<PortalDashboardPage />);

    expect(await screen.findByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Update Housing Intake')).toBeInTheDocument();
    expect(
      screen.queryByText('Your portal is ready when staff share items with you.')
    ).not.toBeInTheDocument();
  });

  it('uses the forms CTA for form-only actions', async () => {
    getDashboardMock.mockResolvedValue(makeActionOnlyDashboard([makeActionItem()]));

    renderWithProviders(<PortalDashboardPage />);

    const section = await getNeedsAttentionSection();
    expect(section.getByRole('link', { name: /view all forms/i })).toHaveAttribute(
      'href',
      '/portal/forms'
    );
  });

  it('uses the messages CTA for message-only actions', async () => {
    getDashboardMock.mockResolvedValue(
      makeActionOnlyDashboard([
        makeActionItem({
          id: 'message:thread-1',
          kind: 'message',
          title: 'Reply to staff message',
          description: 'Staff sent a new note about your case.',
          href: '/portal/messages?thread=thread-1',
          due_at: null,
          status: 'unread',
        }),
      ])
    );

    renderWithProviders(<PortalDashboardPage />);

    const section = await getNeedsAttentionSection();
    expect(section.getByRole('link', { name: /open messages/i })).toHaveAttribute(
      'href',
      '/portal/messages'
    );
  });

  it('uses the appointments CTA for appointment-only actions', async () => {
    getDashboardMock.mockResolvedValue(
      makeActionOnlyDashboard([
        makeActionItem({
          id: 'appointment:appointment-1',
          kind: 'appointment',
          title: 'Confirm your appointment',
          description: 'Please confirm whether this time still works.',
          href: '/portal/appointments?appointment=appointment-1',
          status: 'pending_confirmation',
        }),
      ])
    );

    renderWithProviders(<PortalDashboardPage />);

    const section = await getNeedsAttentionSection();
    expect(section.getByRole('link', { name: /manage appointments/i })).toHaveAttribute(
      'href',
      '/portal/appointments'
    );
  });

  it('uses the first action href with the first action kind label for mixed actions', async () => {
    getDashboardMock.mockResolvedValue(
      makeActionOnlyDashboard([
        makeActionItem({
          id: 'appointment:appointment-1',
          kind: 'appointment',
          title: 'Confirm your appointment',
          description: 'Please confirm whether this time still works.',
          href: '/portal/appointments?appointment=appointment-1',
          status: 'pending_confirmation',
        }),
        makeActionItem({
          id: 'message:thread-1',
          kind: 'message',
          title: 'Reply to staff message',
          description: 'Staff sent a new note about your case.',
          href: '/portal/messages?thread=thread-1',
          due_at: null,
          status: 'unread',
        }),
      ])
    );

    renderWithProviders(<PortalDashboardPage />);

    const section = await getNeedsAttentionSection();
    expect(section.getByRole('link', { name: /manage appointments/i })).toHaveAttribute(
      'href',
      '/portal/appointments?appointment=appointment-1'
    );
  });
});
