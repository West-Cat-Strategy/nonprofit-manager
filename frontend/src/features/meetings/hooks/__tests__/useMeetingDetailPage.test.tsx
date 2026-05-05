import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { meetingsApiClient } from '../../api/meetingsApiClient';
import { useMeetingDetailPage } from '../useMeetingDetailPage';
import type { MeetingDetail } from '../../types/meeting';

vi.mock('../../api/meetingsApiClient', () => ({
  meetingsApiClient: {
    getMeetingDetail: vi.fn(),
    generateMinutesDraft: vi.fn(),
  },
}));

const meetingDetail: MeetingDetail = {
  meeting: {
    id: 'meeting-1',
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
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/meetings/meeting-1']}>
    <Routes>
      <Route path="/meetings/:id" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('useMeetingDetailPage minutes draft actions', () => {
  const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meetingsApiClient.getMeetingDetail).mockResolvedValue(meetingDetail);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:minutes-draft'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    }
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  });

  it('stores generated markdown for in-app preview', async () => {
    vi.mocked(meetingsApiClient.generateMinutesDraft).mockResolvedValue({
      markdown: '# Strategic Planning Session\n\n- Reviewed Q3 goals',
    });

    const { result } = renderHook(() => useMeetingDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.generateMinutes();
    });

    expect(meetingsApiClient.generateMinutesDraft).toHaveBeenCalledWith('meeting-1');
    expect(result.current.minutesDraftMarkdown).toBe(
      '# Strategic Planning Session\n\n- Reviewed Q3 goals'
    );
    expect(result.current.minutesDraftError).toBeNull();
    expect(result.current.minutesDraftCopied).toBe(false);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('copies the generated markdown to the clipboard', async () => {
    vi.mocked(meetingsApiClient.generateMinutesDraft).mockResolvedValue({
      markdown: '# Minutes\n\nCopied text',
    });

    const { result } = renderHook(() => useMeetingDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.generateMinutes();
    });
    await act(async () => {
      await result.current.copyMinutesDraft();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# Minutes\n\nCopied text');
    expect(result.current.minutesDraftError).toBeNull();
    expect(result.current.minutesDraftCopied).toBe(true);
  });

  it('downloads the generated markdown with a meeting filename', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(meetingsApiClient.generateMinutesDraft).mockResolvedValue({
      markdown: '# Minutes\n\nDownload text',
    });

    const { result } = renderHook(() => useMeetingDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.generateMinutes();
    });
    act(() => {
      result.current.downloadMinutesDraft();
    });

    expect(window.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.contexts[0]).toMatchObject({
      download: '2026-04-01-strategic-planning-session-minutes-draft.md',
      href: 'blob:minutes-draft',
    });
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:minutes-draft');
    expect(result.current.minutesDraftError).toBeNull();
  });

  it('reports draft generation failure without browser alert fallback', async () => {
    vi.mocked(meetingsApiClient.generateMinutesDraft).mockRejectedValue(new Error('draft failed'));

    const { result } = renderHook(() => useMeetingDetailPage(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.generateMinutes();
    });

    expect(result.current.minutesDraftMarkdown).toBeNull();
    expect(result.current.minutesDraftError).toBe('Failed to generate minutes draft');
    expect(window.alert).not.toHaveBeenCalled();
  });
});
