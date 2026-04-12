import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  readPersistedDraft,
  usePersistedMessageDraft,
} from '../drafts';

describe('usePersistedMessageDraft', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('persists drafts per surface and thread id', () => {
    const { result, rerender } = renderHook(
      ({ surface, threadId }) => usePersistedMessageDraft(surface, threadId),
      {
        initialProps: {
          surface: 'team-messenger' as const,
          threadId: 'room-1',
        },
      }
    );

    act(() => {
      result.current.setDraft('hello world');
    });

    expect(readPersistedDraft('team-messenger', 'room-1')).toBe('hello world');
    expect(window.sessionStorage.getItem('messaging_drafts_v1')).toContain('hello world');
    expect(window.localStorage.getItem('messaging_drafts_v1')).toBeNull();

    rerender({
      surface: 'portal-client' as const,
      threadId: 'thread-1',
    });

    expect(result.current.draft).toBe('');

    act(() => {
      result.current.setDraft('client reply');
    });

    expect(readPersistedDraft('portal-client', 'thread-1')).toBe('client reply');
    expect(readPersistedDraft('team-messenger', 'room-1')).toBe('hello world');
  });

  it('clears stored drafts when requested', () => {
    const { result } = renderHook(() =>
      usePersistedMessageDraft('case-chat', 'case-1')
    );

    act(() => {
      result.current.setDraft('draft to clear');
    });

    expect(readPersistedDraft('case-chat', 'case-1')).toBe('draft to clear');

    act(() => {
      result.current.clearDraft();
    });

    expect(readPersistedDraft('case-chat', 'case-1')).toBe('');
    expect(result.current.draft).toBe('');
    expect(window.sessionStorage.getItem('messaging_drafts_v1')).toBeNull();
  });
});
