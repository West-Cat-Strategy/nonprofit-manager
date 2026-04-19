import { act, renderHook, waitFor } from '@testing-library/react';
import type * as ReactRouterDom from 'react-router-dom';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

const { navigatorBlockMock, useBeforeUnloadMock } = vi.hoisted(() => ({
  navigatorBlockMock: vi.fn(),
  useBeforeUnloadMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    UNSAFE_NavigationContext: React.createContext({
      navigator: {
        block: navigatorBlockMock,
      },
    }),
    useBeforeUnload: useBeforeUnloadMock,
  };
});

describe('useUnsavedChangesGuard', () => {
  let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | undefined;

  beforeEach(() => {
    navigatorBlockMock.mockReset();
    useBeforeUnloadMock.mockReset();
    beforeUnloadHandler = undefined;

    navigatorBlockMock.mockImplementation(() => vi.fn());
    useBeforeUnloadMock.mockImplementation((handler: (event: BeforeUnloadEvent) => void) => {
      beforeUnloadHandler = handler;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls proceed when the user confirms a blocked navigation', async () => {
    const unblock = vi.fn();
    let navigationHandler: ((transition: { retry(): void }) => void) | undefined;
    navigatorBlockMock.mockImplementation((handler: (transition: { retry(): void }) => void) => {
      navigationHandler = handler;
      return unblock;
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const retry = vi.fn();

    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: true, message: 'Leave now?' }));

    await waitFor(() => expect(navigationHandler).toBeDefined());
    act(() => navigationHandler?.({ retry }));
    expect(confirmSpy).toHaveBeenCalledWith('Leave now?');
    expect(unblock).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('calls reset when the user cancels a blocked navigation', async () => {
    let navigationHandler: ((transition: { retry(): void }) => void) | undefined;
    const unblock = vi.fn();
    navigatorBlockMock.mockImplementation((handler: (transition: { retry(): void }) => void) => {
      navigationHandler = handler;
      return unblock;
    });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const retry = vi.fn();

    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: true, message: 'Leave now?' }));

    await waitFor(() => expect(navigationHandler).toBeDefined());
    act(() => navigationHandler?.({ retry }));
    expect(unblock).not.toHaveBeenCalled();
    expect(retry).not.toHaveBeenCalled();
  });

  it('prevents unload only while unsaved changes are present', () => {
    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: true, message: 'Stay here' }));

    const dirtyEvent = {
      preventDefault: vi.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent;

    beforeUnloadHandler?.(dirtyEvent);

    expect(dirtyEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(dirtyEvent.returnValue).toBe('Stay here');

    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: false, message: 'Stay here' }));

    const cleanEvent = {
      preventDefault: vi.fn(),
      returnValue: '',
    } as unknown as BeforeUnloadEvent;

    beforeUnloadHandler?.(cleanEvent);

    expect(navigatorBlockMock).toHaveBeenCalledTimes(1);
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled();
    expect(cleanEvent.returnValue).toBe('');
  });
});
