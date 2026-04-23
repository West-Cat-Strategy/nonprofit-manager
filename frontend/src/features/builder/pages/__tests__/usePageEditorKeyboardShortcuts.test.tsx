import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePageEditorKeyboardShortcuts } from '../usePageEditorKeyboardShortcuts';

const dispatchKeyboardShortcut = (
  target: EventTarget,
  options: KeyboardEventInit
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...options,
  });

  target.dispatchEvent(event);
  return event;
};

describe('usePageEditorKeyboardShortcuts', () => {
  const redo = vi.fn();
  const saveNow = vi.fn().mockResolvedValue(undefined);
  const undo = vi.fn();

  beforeEach(() => {
    redo.mockReset();
    saveNow.mockReset();
    saveNow.mockResolvedValue(undefined);
    undo.mockReset();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
  ])('runs undo for %s + z', (_label, modifier) => {
    renderHook(() => usePageEditorKeyboardShortcuts({ redo, saveNow, undo }));

    const event = dispatchKeyboardShortcut(window, {
      key: 'z',
      ...modifier,
    });

    expect(event.defaultPrevented).toBe(true);
    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
    expect(saveNow).not.toHaveBeenCalled();
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
  ])('runs redo for %s + shift + z', (_label, modifier) => {
    renderHook(() => usePageEditorKeyboardShortcuts({ redo, saveNow, undo }));

    const event = dispatchKeyboardShortcut(window, {
      key: 'Z',
      shiftKey: true,
      ...modifier,
    });

    expect(event.defaultPrevented).toBe(true);
    expect(redo).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
    expect(saveNow).not.toHaveBeenCalled();
  });

  it('runs redo for ctrl + y', () => {
    renderHook(() => usePageEditorKeyboardShortcuts({ redo, saveNow, undo }));

    const event = dispatchKeyboardShortcut(window, {
      key: 'y',
      ctrlKey: true,
    });

    expect(event.defaultPrevented).toBe(true);
    expect(redo).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
    expect(saveNow).not.toHaveBeenCalled();
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
  ])('runs save for %s + s', (_label, modifier) => {
    renderHook(() => usePageEditorKeyboardShortcuts({ redo, saveNow, undo }));

    const event = dispatchKeyboardShortcut(window, {
      key: 's',
      ...modifier,
    });

    expect(event.defaultPrevented).toBe(true);
    expect(saveNow).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
    expect(undo).not.toHaveBeenCalled();
  });

  it('removes the keydown listener on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePageEditorKeyboardShortcuts({ redo, saveNow, undo }));

    const addedKeydownListener = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === 'keydown'
    )?.[1];

    expect(addedKeydownListener).toBeTypeOf('function');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', addedKeydownListener);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it.each([
    ['input', () => document.createElement('input')],
    ['textarea', () => document.createElement('textarea')],
    ['select', () => document.createElement('select')],
    [
      'contenteditable',
      () => {
        const element = document.createElement('div');
        element.setAttribute('contenteditable', 'true');
        return element;
      },
    ],
  ])('ignores shortcuts from %s targets', (_label, createElement) => {
    renderHook(() => usePageEditorKeyboardShortcuts({ redo, saveNow, undo }));

    const element = createElement();
    document.body.appendChild(element);

    const event = dispatchKeyboardShortcut(element, {
      key: 'z',
      ctrlKey: true,
    });

    expect(event.defaultPrevented).toBe(false);
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
    expect(saveNow).not.toHaveBeenCalled();
  });
});
