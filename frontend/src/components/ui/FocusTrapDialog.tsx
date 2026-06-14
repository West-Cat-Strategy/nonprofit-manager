import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { useEffect, useRef } from 'react';

interface FocusTrapDialogProps {
  isOpen: boolean;
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
  onClose: () => void;
  overlayClassName?: string;
  backdropClassName?: string;
  containerClassName?: string;
  panelClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex >= 0
  );
};

export default function FocusTrapDialog({
  isOpen,
  labelledBy,
  describedBy,
  children,
  onClose,
  overlayClassName = 'fixed inset-0 z-50 overflow-y-auto',
  backdropClassName = 'app-popup-backdrop fixed inset-0 transition-opacity',
  containerClassName = 'flex min-h-full items-center justify-center p-4',
  panelClassName = 'relative w-full',
  initialFocusRef,
  closeOnBackdrop = true,
}: FocusTrapDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    window.setTimeout(() => {
      const target =
        initialFocusRef?.current || getFocusableElements(panelRef.current)[0] || panelRef.current;
      target?.focus();
    }, 0);

    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [initialFocusRef, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getFocusableElements(panelRef.current);
    if (focusableElements.length === 0) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={overlayClassName}>
      <div
        aria-hidden="true"
        className={backdropClassName}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={containerClassName}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={panelClassName}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
