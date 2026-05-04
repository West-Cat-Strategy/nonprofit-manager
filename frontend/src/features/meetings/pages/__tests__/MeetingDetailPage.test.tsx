import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeetingDetailPage from '../MeetingDetailPage';
import { useMeetingDetailPage } from '../../hooks/useMeetingDetailPage';
import { BrowserRouter } from 'react-router-dom';

// Mock the hook
vi.mock('../../hooks/useMeetingDetailPage', () => ({
  useMeetingDetailPage: vi.fn(),
}));

const mockUseMeetingDetailPage = vi.mocked(useMeetingDetailPage);

describe('MeetingDetailPage', () => {
  it('renders loading state', () => {
    mockUseMeetingDetailPage.mockReturnValue({
      meeting: null,
      loading: true,
      error: null,
      minutesDraftMarkdown: null,
      minutesDraftStatus: 'idle',
      minutesDraftMessage: null,
      onEdit: vi.fn(),
      onBack: vi.fn(),
      generateMinutes: vi.fn(),
      copyMinutesDraft: vi.fn(),
      downloadMinutesDraft: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders meeting details', () => {
    mockUseMeetingDetailPage.mockReturnValue({
      meeting: {
        meeting: {
          id: '1',
          title: 'Strategic Planning Session',
          starts_at: '2026-04-01T10:00:00Z',
          ends_at: '2026-04-01T12:00:00Z',
          status: 'completed',
          meeting_type: 'special',
          location: 'Executive Room',
          minutes_notes: 'Discussed goals for Q3',
        },
        committee: { name: 'Executive' },
        agenda_items: [],
        motions: [],
        action_items: [],
      },
      loading: false,
      error: null,
      onEdit: vi.fn(),
      onBack: vi.fn(),
      generateMinutes: vi.fn(),
      minutesDraftMarkdown: null,
      minutesDraftStatus: 'idle',
      minutesDraftMessage: null,
      copyMinutesDraft: vi.fn(),
      downloadMinutesDraft: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Strategic Planning Session')).toBeDefined();
    expect(screen.getByText('Executive Room')).toBeDefined();
    expect(screen.getByText('completed')).toBeDefined();
    expect(screen.getByText('Agenda Items')).toBeDefined();
    expect(screen.getByText('Action Items')).toBeDefined();
  });

  it('renders minutes markdown preview and action buttons', async () => {
    const copyMinutesDraft = vi.fn();
    const downloadMinutesDraft = vi.fn();
    const user = userEvent.setup();

    mockUseMeetingDetailPage.mockReturnValue({
      meeting: {
        meeting: {
          id: '1',
          title: 'Strategic Planning Session',
          starts_at: '2026-04-01T10:00:00Z',
          ends_at: '2026-04-01T12:00:00Z',
          status: 'completed',
          meeting_type: 'special',
          location: 'Executive Room',
          minutes_notes: 'Discussed goals for Q3',
        },
        committee: { name: 'Executive' },
        agenda_items: [],
        motions: [],
        action_items: [],
      },
      loading: false,
      error: null,
      onEdit: vi.fn(),
      onBack: vi.fn(),
      generateMinutes: vi.fn(),
      minutesDraftMarkdown: '# Strategic Planning Session\n\n- Reviewed Q3 goals',
      minutesDraftStatus: 'ready',
      minutesDraftMessage: 'Minutes draft ready for review.',
      copyMinutesDraft,
      downloadMinutesDraft,
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: 'Minutes Draft Preview' })).toBeDefined();
    expect(screen.getByText(/Reviewed Q3 goals/)).toBeDefined();

    await user.click(screen.getByRole('button', { name: /copy/i }));
    await user.click(screen.getByRole('button', { name: /download markdown/i }));

    expect(copyMinutesDraft).toHaveBeenCalledTimes(1);
    expect(downloadMinutesDraft).toHaveBeenCalledTimes(1);
  });

  it('renders minutes draft failure in app', () => {
    mockUseMeetingDetailPage.mockReturnValue({
      meeting: {
        meeting: {
          id: '1',
          title: 'Strategic Planning Session',
          starts_at: '2026-04-01T10:00:00Z',
          ends_at: '2026-04-01T12:00:00Z',
          status: 'completed',
          meeting_type: 'special',
          location: 'Executive Room',
          minutes_notes: null,
        },
        committee: { name: 'Executive' },
        agenda_items: [],
        motions: [],
        action_items: [],
      },
      loading: false,
      error: null,
      onEdit: vi.fn(),
      onBack: vi.fn(),
      generateMinutes: vi.fn(),
      minutesDraftMarkdown: null,
      minutesDraftStatus: 'error',
      minutesDraftMessage: 'Failed to generate minutes draft.',
      copyMinutesDraft: vi.fn(),
      downloadMinutesDraft: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to generate minutes draft.');
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /download markdown/i })).toBeNull();
  });
});
