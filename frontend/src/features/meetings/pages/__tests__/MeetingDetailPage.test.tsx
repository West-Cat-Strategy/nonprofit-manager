import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      onEdit: vi.fn(),
      onBack: vi.fn(),
      generateMinutes: vi.fn(),
      minutesDraftMarkdown: null,
      minutesDraftLoading: false,
      minutesDraftError: null,
      minutesDraftCopied: false,
      copyMinutesDraft: vi.fn(),
      downloadMinutesDraft: vi.fn(),
      closeMinutesDraft: vi.fn(),
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
      minutesDraftLoading: false,
      minutesDraftError: null,
      minutesDraftCopied: false,
      copyMinutesDraft: vi.fn(),
      downloadMinutesDraft: vi.fn(),
      closeMinutesDraft: vi.fn(),
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
});
