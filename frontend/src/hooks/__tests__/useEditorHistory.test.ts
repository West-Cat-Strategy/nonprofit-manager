/**
 * Tests for useEditorHistory hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEditorHistory } from '../useEditorHistory';
import type { PageSection } from '../../types/websiteBuilder';

describe('useEditorHistory', () => {
  const createMockSection = (id: string, name: string): PageSection => ({
    id,
    name,
    components: [],
  });

  const initialSections: PageSection[] = [
    createMockSection('section-1', 'Section 1'),
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with initial sections', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    expect(result.current.sections).toEqual(initialSections);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(1);
    expect(result.current.currentIndex).toBe(0);
  });

  it('should update sections and track history', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    const newSections: PageSection[] = [
      createMockSection('section-1', 'Section 1'),
      createMockSection('section-2', 'Section 2'),
    ];

    act(() => {
      result.current.setSections(newSections);
    });

    // Sections should update immediately
    expect(result.current.sections).toEqual(newSections);

    // Wait for debounce to commit to history
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo changes', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    const newSections: PageSection[] = [
      createMockSection('section-1', 'Updated Section 1'),
    ];

    act(() => {
      result.current.setSections(newSections);
      vi.advanceTimersByTime(400);
    });

    expect(result.current.sections[0].name).toBe('Updated Section 1');
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.sections).toEqual(initialSections);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo changes', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    const newSections: PageSection[] = [
      createMockSection('section-1', 'Updated Section 1'),
    ];

    act(() => {
      result.current.setSections(newSections);
      vi.advanceTimersByTime(400);
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.sections[0].name).toBe('Updated Section 1');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should not undo when at beginning of history', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.sections).toEqual(initialSections);
    expect(result.current.currentIndex).toBe(0);
  });

  it('should not redo when at end of history', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.redo();
    });

    expect(result.current.sections).toEqual(initialSections);
    expect(result.current.currentIndex).toBe(0);
  });

  it('should clear future history when making changes after undo', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    // Make first change
    act(() => {
      result.current.setSections([createMockSection('section-1', 'Change 1')]);
      vi.advanceTimersByTime(400);
    });

    // Make second change
    act(() => {
      result.current.setSections([createMockSection('section-1', 'Change 2')]);
      vi.advanceTimersByTime(400);
    });

    // Undo to first change
    act(() => {
      result.current.undo();
    });

    expect(result.current.sections[0].name).toBe('Change 1');
    expect(result.current.canRedo).toBe(true);

    // Make new change (should clear the redo history)
    act(() => {
      result.current.setSections([createMockSection('section-1', 'Change 3')]);
      vi.advanceTimersByTime(400);
    });

    expect(result.current.canRedo).toBe(false);
    expect(result.current.sections[0].name).toBe('Change 3');
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useEditorHistory(initialSections));

    // Make some changes
    act(() => {
      result.current.setSections([createMockSection('section-1', 'Change 1')]);
      vi.advanceTimersByTime(400);
    });

    act(() => {
      result.current.setSections([createMockSection('section-1', 'Change 2')]);
      vi.advanceTimersByTime(400);
    });

    expect(result.current.historyLength).toBeGreaterThan(1);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.historyLength).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.sections[0].name).toBe('Change 2'); // Keeps current state
  });

  it('should respect maxHistoryLength option', () => {
    const { result } = renderHook(() =>
      useEditorHistory(initialSections, { maxHistoryLength: 3 })
    );

    // Make 5 changes
    for (let i = 1; i <= 5; i++) {
      act(() => {
        result.current.setSections([createMockSection('section-1', `Change ${i}`)]);
        vi.advanceTimersByTime(400);
      });
    }

    // History should be limited to 3
    expect(result.current.historyLength).toBeLessThanOrEqual(3);
  });

  it('should reset history when initial sections change', () => {
    const { result, rerender } = renderHook(
      ({ sections }) => useEditorHistory(sections),
      { initialProps: { sections: initialSections } }
    );

    // Make a change
    act(() => {
      result.current.setSections([createMockSection('section-1', 'Change 1')]);
      vi.advanceTimersByTime(400);
    });

    expect(result.current.canUndo).toBe(true);

    // Change initial sections (simulating page change)
    const newInitialSections = [createMockSection('section-new', 'New Page')];
    rerender({ sections: newInitialSections });

    expect(result.current.sections).toEqual(newInitialSections);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(1);
  });
});
