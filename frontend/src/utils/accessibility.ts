/**
 * Accessibility utilities and helpers
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Generate a unique ID for ARIA attributes
 */
let idCounter = 0;
export function generateAriaId(prefix = 'aria'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Announce a message to screen readers using aria-live region
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.setAttribute('class', 'sr-only');
  announcer.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';

  document.body.appendChild(announcer);

  // Small delay to ensure the element is in the DOM before announcing
  setTimeout(() => {
    announcer.textContent = message;
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, 100);
}

/**
 * Hook for managing focus trap within a modal/dialog
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive) return;

    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus when trap is deactivated
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for keyboard navigation in lists
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  _itemCount: number,
  onSelect?: (index: number) => void
) {
  const containerRef = useRef<T | null>(null);
  const currentIndex = useRef(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      const items = containerRef.current.querySelectorAll<HTMLElement>('[role="option"], [role="menuitem"], li');
      if (items.length === 0) return;

      let newIndex = currentIndex.current;

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          newIndex = Math.min(currentIndex.current + 1, items.length - 1);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = Math.max(currentIndex.current - 1, 0);
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(currentIndex.current);
          return;
        default:
          return;
      }

      currentIndex.current = newIndex;
      items[newIndex]?.focus();
    },
    [onSelect]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return containerRef;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook for skip-to-content link
 */
export function useSkipToContent(mainContentId = 'main-content') {
  const skipToMain = useCallback(() => {
    const mainContent = document.getElementById(mainContentId);
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.removeAttribute('tabindex');
    }
  }, [mainContentId]);

  return skipToMain;
}

/**
 * ARIA label helpers
 */
export const ariaLabels = {
  navigation: {
    main: 'Main navigation',
    secondary: 'Secondary navigation',
    breadcrumb: 'Breadcrumb',
    pagination: 'Pagination',
  },
  buttons: {
    close: 'Close',
    menu: 'Open menu',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    more: 'More options',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
  },
  forms: {
    required: 'Required field',
    optional: 'Optional field',
    error: 'Error:',
    hint: 'Hint:',
  },
  status: {
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  },
} as const;

/**
 * Generate aria-describedby for form inputs with error and hint
 */
export function getAriaDescribedBy(
  baseId: string,
  options: { hasError?: boolean; hasHint?: boolean }
): string | undefined {
  const ids: string[] = [];
  if (options.hasHint) ids.push(`${baseId}-hint`);
  if (options.hasError) ids.push(`${baseId}-error`);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
