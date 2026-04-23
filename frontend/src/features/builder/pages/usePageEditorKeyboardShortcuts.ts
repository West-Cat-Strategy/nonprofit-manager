import { useEffect } from 'react';

type PageEditorKeyboardShortcutsParams = {
  redo: () => void;
  saveNow: () => void | Promise<void>;
  undo: () => void;
};

export function usePageEditorKeyboardShortcuts({
  redo,
  saveNow,
  undo,
}: PageEditorKeyboardShortcutsParams): void {
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tagName = target.tagName.toLowerCase();
      return (
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true' ||
        target.closest('[contenteditable="true"]') !== null ||
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select'
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((event.metaKey || event.ctrlKey) && key === 'y') {
        event.preventDefault();
        redo();
      }

      if ((event.metaKey || event.ctrlKey) && key === 's') {
        event.preventDefault();
        void saveNow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [redo, saveNow, undo]);
}
