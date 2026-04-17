import { useEffect } from 'react';
import type { ReactNode, RefObject } from 'react';
import { classNames } from '../ui/classNames';

interface NavPopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  panelClassName?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
}

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function NavPopover({
  open,
  onClose,
  children,
  align = 'left',
  panelClassName,
  panelRef,
}: NavPopoverProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const container = panelRef?.current;
    if (!container) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);

      if (focusableElements.length === 0) {
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === firstFocusable || !container.contains(current)) {
          event.preventDefault();
          lastFocusable.focus();
        }
        return;
      }

      if (current === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [open, panelRef]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-10"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        data-shell-transition
        className={classNames(
          'menu-surface-opaque absolute z-20 mt-2 rounded-lg border border-app-border py-1 shadow-lg animate-fadeIn',
          align === 'right' ? 'right-0' : 'left-0',
          panelClassName
        )}
      >
        {children}
      </div>
    </>
  );
}
