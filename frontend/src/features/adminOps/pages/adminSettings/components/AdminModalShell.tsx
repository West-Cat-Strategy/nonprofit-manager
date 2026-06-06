import React, { useEffect, useId, useRef } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface AdminModalShellProps {
  children: React.ReactNode;
  closeLabel: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  sizeClassName?: string;
  title: React.ReactNode;
}

export default function AdminModalShell({
  children,
  closeLabel,
  description,
  footer,
  onClose,
  sizeClassName = 'max-w-md',
  title,
}: AdminModalShellProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget =
      panelRef.current?.querySelector<HTMLElement>(focusableSelector) ?? panelRef.current;
    focusTarget?.focus();

    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !panelRef.current) {
      return;
    }

    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter((element) => element.offsetParent !== null || element === document.activeElement);

    if (focusable.length === 0) {
      event.preventDefault();
      panelRef.current.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onKeyDown={handleKeyDown}>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 app-popup-backdrop" onClick={onClose} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={`relative max-h-[90vh] w-full overflow-y-auto rounded-lg bg-app-surface p-6 shadow-xl ${sizeClassName}`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 id={titleId} className="text-lg font-semibold text-app-text-heading">
                {title}
              </h3>
              {description ? (
                <div id={descriptionId} className="mt-1 text-sm text-app-text-muted">
                  {description}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-app-text-subtle hover:text-app-text-muted"
              aria-label={closeLabel}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {children}

          {footer ? <div className="mt-6 flex justify-end space-x-3">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
