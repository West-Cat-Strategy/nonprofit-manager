import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const portalGetMock = vi.fn();
let realtimeStatus: 'connected' | 'connecting' | 'disconnected' = 'connected';
let realtimeOptions:
  | {
      onEvent: (eventName: string, payload: Record<string, unknown>) => void;
    }
  | null = null;

vi.mock('../../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => portalGetMock(...args),
  },
}));

vi.mock('../usePortalRealtimeStream', () => ({
  default: (options: {
    onEvent: (eventName: string, payload: Record<string, unknown>) => void;
  }) => {
    realtimeOptions = options;
    return realtimeStatus;
  },
}));

import usePortalAppointments from '../usePortalAppointments';
import usePortalMessageThreads from '../usePortalMessageThreads';
import usePortalPagedList from '../usePortalPagedList';

describe('portal data hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeStatus = 'connected';
    realtimeOptions = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('trims search values, paginates results, and resets cleanly when disabled', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        items: [{ id: 'item-1' }],
        page: { limit: 1, offset: 0, has_more: true, total: 2 },
      })
      .mockResolvedValueOnce({
        items: [{ id: 'item-2' }],
        page: { limit: 1, offset: 1, has_more: false, total: 2 },
      });

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePortalPagedList({
          search: '  housing  ',
          sort: 'created_at',
          order: 'desc',
          pageSize: 1,
          enabled,
          fetchPage,
        }),
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => expect(result.current.items).toEqual([{ id: 'item-1' }]));
    expect(fetchPage).toHaveBeenCalledWith({
      search: 'housing',
      sort: 'created_at',
      order: 'desc',
      limit: 1,
      offset: 0,
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toEqual([{ id: 'item-1' }, { id: 'item-2' }]);
    expect(result.current.hasMore).toBe(false);

    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.items).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('fetches filtered message threads and merges realtime updates for the selected case', async () => {
    const onRealtimeEvent = vi.fn();
    portalGetMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          threads: [
            {
              id: 'thread-1',
              subject: 'Initial thread',
              status: 'open',
              case_number: 'CASE-001',
              case_title: 'Housing Support',
              pointperson_first_name: 'Alex',
              pointperson_last_name: 'Rivera',
              unread_count: 1,
              last_message_at: '2026-04-18T12:00:00.000Z',
              last_message_preview: 'Starting point',
            },
          ],
        },
      },
    });

    const { result } = renderHook(() =>
      usePortalMessageThreads({
        statusFilter: 'open',
        search: '',
        selectedCaseId: 'case-1',
        caseFilter: 'selected',
        onRealtimeEvent,
      })
    );

    await waitFor(() => expect(result.current.threads).toHaveLength(1));
    expect(portalGetMock).toHaveBeenCalledWith('/v2/portal/messages/threads', {
      params: {
        limit: 20,
        status: 'open',
        case_id: 'case-1',
        offset: 0,
      },
    });

    act(() => {
      realtimeOptions?.onEvent('portal.thread.updated', {
        thread: {
          id: 'thread-2',
          subject: 'New realtime thread',
          status: 'open',
          case_number: 'CASE-001',
          case_title: 'Housing Support',
          pointperson_first_name: 'Alex',
          pointperson_last_name: 'Rivera',
          portal_unread_count: 3,
          last_message_at: '2026-04-18T13:00:00.000Z',
          last_message_preview: 'Fresh update',
        },
        case_id: 'case-1',
      });
    });

    await waitFor(() =>
      expect(result.current.threads.map((thread) => thread.id)).toEqual(['thread-2', 'thread-1'])
    );
    expect(onRealtimeEvent).toHaveBeenCalledWith(
      'portal.thread.updated',
      expect.objectContaining({
        case_id: 'case-1',
      })
    );

    act(() => {
      realtimeOptions?.onEvent('portal.thread.updated', {
        thread: {
          id: 'thread-3',
          subject: 'Different case',
          status: 'open',
          case_number: 'CASE-002',
          case_title: 'Employment Support',
          pointperson_first_name: 'Alex',
          pointperson_last_name: 'Rivera',
          portal_unread_count: 1,
          last_message_at: '2026-04-18T14:00:00.000Z',
          last_message_preview: 'Should be ignored',
        },
        case_id: 'case-99',
      });
    });

    expect(result.current.threads.map((thread) => thread.id)).toEqual(['thread-2', 'thread-1']);
  });

  it('refetches appointments on realtime events and falls back to polling when the stream disconnects', async () => {
    realtimeStatus = 'disconnected';
    let pollCallback: (() => void) | null = null;
    const setIntervalSpy = vi
      .spyOn(window, 'setInterval')
      .mockImplementation(((callback: TimerHandler) => {
        pollCallback = callback as () => void;
        return 1;
      }) as typeof window.setInterval);
    const clearIntervalSpy = vi
      .spyOn(window, 'clearInterval')
      .mockImplementation(() => undefined);
    portalGetMock.mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'appointment-1',
            title: 'Case check-in',
            description: 'Bring intake papers',
            start_time: '2026-04-18T18:00:00.000Z',
            status: 'confirmed',
            location: 'Main office',
            case_number: 'CASE-001',
            request_type: 'manual_request',
          },
        ],
      },
    });

    const { result } = renderHook(() =>
      usePortalAppointments({
        statusFilter: 'confirmed',
        search: '  check-in  ',
        selectedCaseId: 'case-1',
        caseFilter: 'selected',
        from: '2026-04-01',
        to: '2026-04-30',
      })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.appointments).toHaveLength(1);
    expect(portalGetMock).toHaveBeenCalledWith('/v2/portal/appointments', {
      params: {
        limit: 20,
        status: 'confirmed',
        search: 'check-in',
        case_id: 'case-1',
        from: '2026-04-01',
        to: '2026-04-30',
        offset: 0,
      },
    });
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);

    act(() => {
      realtimeOptions?.onEvent('portal.appointment.updated', {
        appointment_id: 'appointment-1',
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(portalGetMock).toHaveBeenCalledTimes(2);

    expect(pollCallback).not.toBeNull();
    await act(async () => {
      pollCallback?.();
    });

    expect(portalGetMock).toHaveBeenCalledTimes(3);
    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });
});
