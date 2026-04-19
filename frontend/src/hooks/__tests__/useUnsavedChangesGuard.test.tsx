import { renderHook, waitFor } from '@testing-library/react';
import type * as ReactRouterDom from 'react-router-dom';
import type { Blocker } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

const { useBlockerMock, useBeforeUnloadMock } = vi.hoisted(() => ({
  useBlockerMock: vi.fn(),
  useBeforeUnloadMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useBlocker: useBlockerMock,
    useBeforeUnload: useBeforeUnloadMock,
  };
});

const createBlockedBlocker = () =>
  ({
    state: 'blocked',
    location: {} as never,
    proceed: vi.fn(),
    reset: vi.fn(),
  }) as Blocker;

const createIdleBlocker = () =>
  ({
    state: 'unblocked',
    location: undefined,
    proceed: undefined,
    reset: undefined,
  }) as Blocker;

describe('useUnsavedChangesGuard', () => {
  let beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | undefined;

  beforeEach(() => {
    useBlockerMock.mockReset();
    useBeforeUnloadMock.mockReset();
    beforeUnloadHandler = undefined;

    useBlockerMock.mockReturnValue(createIdleBlocker());
    useBeforeUnloadMock.mockImplementation((handler: (event: BeforeUnloadEvent) => void) => {
      beforeUnloadHandler = handler;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls proceed when the user confirms a blocked navigation', async () => {
    const blocker = createBlockedBlocker();
    useBlockerMock.mockReturnValue(blocker);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: true, message: 'Leave now?' }));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith('Leave now?'));
    expect(useBlockerMock).toHaveBeenCalledWith(true);
    expect(blocker.proceed).toHaveBeenCalledTimes(1);
    expect(blocker.reset).not.toHaveBeenCalled();
  });

  it('calls reset when the user cancels a blocked navigation', async () => {
    const blocker = createBlockedBlocker();
    useBlockerMock.mockReturnValue(blocker);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderHook(() => useUnsavedChangesGuard({ hasUnsavedChanges: true, message: 'Leave now?' }));

    await waitFor(() => expect(blocker.reset).toHaveBeenCalledTimes(1));
    expect(useBlockerMock).toHaveBeenCalledWith(true);
    expect(blocker.proceed).not.toHaveBeenCalled();
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

    expect(cleanEvent.preventDefault).not.toHaveBeenCalled();
    expect(cleanEvent.returnValue).toBe('');
  });
});
