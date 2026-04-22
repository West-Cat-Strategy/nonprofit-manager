import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingListPage from '../MeetingListPage';
import { useMeetingListPage } from '../../hooks/useMeetingListPage';
import { BrowserRouter } from 'react-router-dom';

// Mock the hook
vi.mock('../../hooks/useMeetingListPage', () => ({
  useMeetingListPage: vi.fn(),
}));

const mockUseMeetingListPage = vi.mocked(useMeetingListPage);

describe('MeetingListPage', () => {
  it('renders loading state', () => {
    mockUseMeetingListPage.mockReturnValue({
      meetings: [],
      loading: true,
      error: null,
      onCreateNew: vi.fn(),
      onRowClick: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingListPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders error state', () => {
    mockUseMeetingListPage.mockReturnValue({
      meetings: [],
      loading: false,
      error: 'Failed to load',
      onCreateNew: vi.fn(),
      onRowClick: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingListPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Failed to load')).toBeDefined();
  });

  it('renders empty state', () => {
    mockUseMeetingListPage.mockReturnValue({
      meetings: [],
      loading: false,
      error: null,
      onCreateNew: vi.fn(),
      onRowClick: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingListPage />
      </BrowserRouter>
    );

    expect(screen.getByText('No meetings scheduled')).toBeDefined();
    expect(screen.getByText('Schedule your first meeting')).toBeDefined();
  });

  it('renders list of meetings', () => {
    mockUseMeetingListPage.mockReturnValue({
      meetings: [
        {
          id: '1',
          title: 'Annual Board Meeting',
          starts_at: '2026-04-01T10:00:00Z',
          status: 'scheduled',
          meeting_type: 'board',
          location: 'Board Room',
        },
        {
          id: '2',
          title: 'Monthly Staff Update',
          starts_at: '2026-04-05T14:00:00Z',
          status: 'in_progress',
          meeting_type: 'staff',
          location: 'Main Hall',
        },
      ],
      loading: false,
      error: null,
      onCreateNew: vi.fn(),
      onRowClick: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingListPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Annual Board Meeting')).toBeDefined();
    expect(screen.getByText('Monthly Staff Update')).toBeDefined();
    expect(screen.getByText('scheduled')).toBeDefined();
    expect(screen.getByText('in_progress')).toBeDefined();
  });
});
