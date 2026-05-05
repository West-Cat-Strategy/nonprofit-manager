import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MeetingDetailPage from '../MeetingDetailPage';
import type { MeetingDetail } from '../../types/meeting';
import {
  getTestApiCalls,
  registerTestApiGet,
} from '../../../../test/setup';

const meetingDetail: MeetingDetail = {
  meeting: {
    id: 'meeting-1',
    committee_id: 'committee-1',
    meeting_type: 'board',
    title: 'April Governance',
    starts_at: '2026-04-01T10:00:00Z',
    ends_at: '2026-04-01T12:00:00Z',
    location: 'Main Hall',
    status: 'completed',
    presiding_contact_id: null,
    secretary_contact_id: null,
    minutes_notes: 'Adjourned at 6:15 PM',
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T12:30:00Z',
  },
  committee: {
    id: 'committee-1',
    name: 'Governance',
    description: null,
    is_system: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  agenda_items: [
    {
      id: 'agenda-1',
      meeting_id: 'meeting-1',
      position: 1,
      title: 'Treasurer Report',
      description: 'Quarterly financial summary',
      item_type: 'report',
      duration_minutes: 20,
      presenter_contact_id: null,
      status: 'discussed',
      created_at: '2026-04-01T09:00:00Z',
      updated_at: '2026-04-01T12:30:00Z',
    },
  ],
  motions: [],
  action_items: [],
};

const minutesMarkdown = [
  '# Minutes Draft: April Governance',
  '',
  '- Committee: Governance',
  '',
  '## Agenda',
  '1. Treasurer Report',
  '',
  '## Action Items',
  'No action items recorded.',
].join('\n');

const renderMeetingDetail = () => {
  render(
    <MemoryRouter initialEntries={['/meetings/meeting-1']}>
      <Routes>
        <Route path="/meetings/:id" element={<MeetingDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('MeetingDetailPage minutes draft flow', () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      configurable: true,
    });
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:minutes-draft'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });

    registerTestApiGet('/v2/meetings/meeting-1', { data: meetingDetail });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders generated minutes markdown after clicking Draft Minutes', async () => {
    const draftRegistration = registerTestApiGet('/v2/meetings/meeting-1/minutes/draft', {
      data: { markdown: minutesMarkdown },
    });

    renderMeetingDetail();

    expect(await screen.findByRole('heading', { name: /april governance/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /draft minutes/i }));

    expect(await screen.findByRole('heading', { name: /minutes draft preview/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/generated minutes markdown/i)).toHaveTextContent(
      '# Minutes Draft: April Governance'
    );
    expect(screen.getByLabelText(/generated minutes markdown/i)).toHaveTextContent('## Agenda');
    expect(draftRegistration.getCalls()).toHaveLength(1);
    expect(getTestApiCalls('get', '/v2/meetings/meeting-1/minutes/draft')).toHaveLength(1);
  });

  it('copies the generated markdown to the clipboard', async () => {
    registerTestApiGet('/v2/meetings/meeting-1/minutes/draft', {
      data: { markdown: minutesMarkdown },
    });

    renderMeetingDetail();

    await userEvent.click(await screen.findByRole('button', { name: /draft minutes/i }));
    await screen.findByRole('heading', { name: /minutes draft preview/i });
    await userEvent.click(screen.getByRole('button', { name: /copy markdown/i }));

    expect(clipboardWriteText).toHaveBeenCalledWith(minutesMarkdown);
    expect(await screen.findByText('Minutes markdown copied.')).toBeInTheDocument();
  });

  it('downloads the generated markdown as an md file', async () => {
    registerTestApiGet('/v2/meetings/meeting-1/minutes/draft', {
      data: { markdown: minutesMarkdown },
    });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    let createdAnchor: HTMLAnchorElement | null = null;

    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'a') {
        createdAnchor = element as HTMLAnchorElement;
      }
      return element;
    });

    renderMeetingDetail();

    await userEvent.click(await screen.findByRole('button', { name: /draft minutes/i }));
    await screen.findByRole('heading', { name: /minutes draft preview/i });
    await userEvent.click(screen.getByRole('button', { name: /download \.md/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = vi.mocked(URL.createObjectURL).mock.calls[0];
    await expect((blob as Blob).text()).resolves.toBe(minutesMarkdown);
    expect(createdAnchor?.download).toBe('2026-04-01-april-governance-minutes-draft.md');
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:minutes-draft');
  });

  it('shows an in-page error when draft generation fails', async () => {
    registerTestApiGet('/v2/meetings/meeting-1/minutes/draft', () => {
      throw new Error('draft failed');
    });

    renderMeetingDetail();

    await userEvent.click(await screen.findByRole('button', { name: /draft minutes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to generate minutes draft');
    expect(screen.queryByRole('heading', { name: /minutes draft preview/i })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.alert).not.toHaveBeenCalled();
    });
  });
});
