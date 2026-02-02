/**
 * Tests for useAutoSave hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAutoSave } from '../useAutoSave';

describe('useAutoSave', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnSave.mockReset();
    mockOnSave.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        data: { test: 'data' },
        onSave: mockOnSave,
      })
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastSaved).toBe(null);
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should detect unsaved changes when data changes', () => {
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    expect(result.current.hasUnsavedChanges).toBe(false);

    // Change the data
    rerender({ data: { test: 'changed' } });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should auto-save after debounce period', async () => {
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
          debounceMs: 1000,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    // Change the data
    rerender({ data: { test: 'changed' } });

    expect(mockOnSave).not.toHaveBeenCalled();

    // Advance time past debounce
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(mockOnSave).toHaveBeenCalledWith({ test: 'changed' });
  });

  it('should not auto-save when disabled', async () => {
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
          debounceMs: 1000,
          enabled: false,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'changed' } });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should saveNow immediately', async () => {
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
          debounceMs: 5000,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'changed' } });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(mockOnSave).toHaveBeenCalledWith({ test: 'changed' });
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should update lastSaved after successful save', async () => {
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
          debounceMs: 1000,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    expect(result.current.lastSaved).toBe(null);

    rerender({ data: { test: 'changed' } });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should handle save errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockOnSave.mockRejectedValueOnce(new Error('Save failed'));

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
          debounceMs: 1000,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'changed' } });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(consoleError).toHaveBeenCalled();
    expect(result.current.lastSaved).toBe(null);
    expect(result.current.hasUnsavedChanges).toBe(true);

    consoleError.mockRestore();
  });

  it('should set isSaving during save operation', async () => {
    let resolvePromise: () => void;
    const slowSave = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: slowSave,
          debounceMs: 100,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'changed' } });

    // Start the save
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Should be saving
    expect(result.current.isSaving).toBe(true);

    // Complete the save
    await act(async () => {
      resolvePromise!();
    });

    expect(result.current.isSaving).toBe(false);
  });

  it('should markAsSaved correctly', () => {
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    rerender({ data: { test: 'changed' } });
    expect(result.current.hasUnsavedChanges).toBe(true);

    act(() => {
      result.current.markAsSaved();
    });

    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should not save if data has not changed', async () => {
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
          debounceMs: 1000,
        }),
      { initialProps: { data: { test: 'initial' } } }
    );

    // Rerender with same data
    rerender({ data: { test: 'initial' } });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should debounce multiple rapid changes', async () => {
    const { rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          onSave: mockOnSave,
          debounceMs: 1000,
        }),
      { initialProps: { data: { count: 0 } } }
    );

    // Make multiple rapid changes
    for (let i = 1; i <= 5; i++) {
      rerender({ data: { count: i } });
      act(() => {
        vi.advanceTimersByTime(200);
      });
    }

    // Only one save should be pending
    expect(mockOnSave).not.toHaveBeenCalled();

    // Wait for debounce
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should save with final value
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith({ count: 5 });
  });
});
