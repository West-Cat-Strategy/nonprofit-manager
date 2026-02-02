/**
 * Editor History Hook
 * Provides undo/redo functionality for the page editor
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PageSection } from '../types/websiteBuilder';

interface HistoryState {
  sections: PageSection[];
  timestamp: number;
}

interface UseEditorHistoryOptions {
  maxHistoryLength?: number;
  debounceMs?: number;
}

interface UseEditorHistoryReturn {
  sections: PageSection[];
  setSections: (sections: PageSection[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  currentIndex: number;
  clearHistory: () => void;
}

export function useEditorHistory(
  initialSections: PageSection[],
  options: UseEditorHistoryOptions = {}
): UseEditorHistoryReturn {
  const { maxHistoryLength = 50, debounceMs = 300 } = options;

  // History stack - immutable entries
  const [history, setHistory] = useState<HistoryState[]>([
    { sections: initialSections, timestamp: Date.now() },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pending state for immediate UI updates (before history commit)
  const [pendingState, setPendingState] = useState<PageSection[] | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Current sections: use pending state if available, otherwise from history
  const sections = pendingState ?? history[currentIndex]?.sections ?? initialSections;

  // Check if undo/redo is available
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Commit pending state to history
  const commitToHistory = useCallback(
    (newSections: PageSection[], fromIndex: number) => {
      setHistory((prevHistory) => {
        // Remove any future states if we're not at the end
        const newHistory = prevHistory.slice(0, fromIndex + 1);

        // Add new state
        newHistory.push({
          sections: newSections,
          timestamp: Date.now(),
        });

        // Trim history if it exceeds max length
        if (newHistory.length > maxHistoryLength) {
          const trimmed = newHistory.slice(-maxHistoryLength);
          // Adjust currentIndex to account for trimming
          setCurrentIndex(trimmed.length - 1);
          return trimmed;
        }

        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      });

      // Clear pending state after commit
      setPendingState(null);
    },
    [maxHistoryLength]
  );

  // Set sections with debounced history commit
  const setSections = useCallback(
    (newSections: PageSection[]) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Update pending state immediately for responsive UI
      setPendingState(newSections);

      // Capture current index for the commit
      const commitIndex = currentIndex;

      // Debounce the history commit
      debounceTimerRef.current = setTimeout(() => {
        commitToHistory(newSections, commitIndex);
      }, debounceMs);
    },
    [commitToHistory, currentIndex, debounceMs]
  );

  // Undo action
  const undo = useCallback(() => {
    if (canUndo) {
      // Clear any pending debounced updates
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Clear pending state - revert to committed history
      setPendingState(null);

      setCurrentIndex((prev) => prev - 1);
    }
  }, [canUndo]);

  // Redo action
  const redo = useCallback(() => {
    if (canRedo) {
      // Clear pending state when redoing
      setPendingState(null);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canRedo]);

  // Clear history
  const clearHistory = useCallback(() => {
    const currentSections = pendingState ?? history[currentIndex]?.sections ?? initialSections;
    setHistory([{ sections: currentSections, timestamp: Date.now() }]);
    setCurrentIndex(0);
    setPendingState(null);
  }, [history, currentIndex, initialSections, pendingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Reset history when initial sections change (e.g., loading different page)
  useEffect(() => {
    setHistory([{ sections: initialSections, timestamp: Date.now() }]);
    setCurrentIndex(0);
    setPendingState(null);
  }, [initialSections]);

  return {
    sections,
    setSections,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex,
    clearHistory,
  };
}

export default useEditorHistory;
