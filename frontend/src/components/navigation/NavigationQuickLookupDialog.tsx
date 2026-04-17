import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useQuickLookup } from '../dashboard/useQuickLookup';

interface NavigationQuickLookupDialogProps {
  onClose: () => void;
}

const focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1
  );
}

export default function NavigationQuickLookupDialog({
  onClose,
}: NavigationQuickLookupDialogProps) {
  const navigate = useNavigate();
  const lookup = useQuickLookup({ debounceMs: 250 });
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const dialogId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const resultsId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = document.createElement('div');
    node.dataset.quickLookupPortal = 'true';
    document.body.appendChild(node);
    setPortalNode(node);

    return () => {
      node.remove();
      setPortalNode(null);
    };
  }, []);

  useEffect(() => {
    if (!portalNode) {
      return;
    }

    const siblings = Array.from(document.body.children).filter((element) => element !== portalNode);
    const previousState = siblings.map((element) => ({
      element,
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.hasAttribute('inert'),
    }));

    siblings.forEach((element) => {
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
    });

    return () => {
      previousState.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }

        if (inert) {
          element.setAttribute('inert', '');
        } else {
          element.removeAttribute('inert');
        }
      });
    };
  }, [portalNode]);

  useEffect(() => {
    lookup.inputRef.current?.focus();
  }, [lookup.inputRef, portalNode]);

  useEffect(() => {
    if (lookup.results.length === 0 || lookup.searchTerm.trim().length < 2) {
      setActiveResultIndex(-1);
      return;
    }

    setActiveResultIndex(0);
  }, [lookup.results, lookup.searchTerm]);

  useEffect(() => {
    if (activeResultIndex < 0) {
      return;
    }

    const activeItem = dialogRef.current?.querySelector<HTMLElement>(
      `[data-quick-lookup-result-index="${activeResultIndex}"]`
    );
    activeItem?.scrollIntoView?.({ block: 'nearest' });
  }, [activeResultIndex]);

  const resultCount = lookup.results.length;
  const hasSearchResults = resultCount > 0 && lookup.searchTerm.trim().length >= 2;
  const activeDescendantId =
    hasSearchResults && activeResultIndex >= 0
      ? `${dialogId}-result-${activeResultIndex}`
      : undefined;

  const selectResult = (contactId: number | string) => {
    onClose();
    navigate(`/contacts/${contactId}`);
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements(dialogRef.current);
      if (focusableElements.length === 0) {
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === firstFocusable || !dialogRef.current?.contains(current)) {
          event.preventDefault();
          lastFocusable.focus();
        }
        return;
      }

      if (current === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (!hasSearchResults) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIndex((currentIndex) =>
        currentIndex < 0 ? 0 : (currentIndex + 1) % resultCount
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIndex((currentIndex) =>
        currentIndex < 0 ? resultCount - 1 : (currentIndex - 1 + resultCount) % resultCount
      );
      return;
    }

    if (event.key === 'Enter' && activeResultIndex >= 0) {
      event.preventDefault();
      const activeResult = lookup.results[activeResultIndex];
      if (activeResult) {
        selectResult(activeResult.contact_id);
      }
    }
  };

  if (!portalNode) {
    return null;
  }

  return createPortal(
    <div
      className="app-popup-backdrop fixed inset-0 z-[70] flex items-start justify-center p-4"
      data-shell-transition
      onClick={onClose}
    >
      <div
        id="navigation-quick-lookup-dialog"
        ref={dialogRef}
        className="app-popup-surface-translucent mt-16 w-full max-w-2xl rounded-lg shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-shell-transition
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-center justify-between border-b border-app-border p-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-app-text-heading">
              Search people
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-app-text-muted">
              Search by name, email, or phone. Use the arrow keys to move through matches.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-app-text-subtle hover:text-app-text-muted"
            type="button"
            aria-label="Close search dialog"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-app-text-heading">
              Search people
            </label>
            <input
              id={inputId}
              ref={lookup.inputRef}
              type="text"
              value={lookup.searchTerm}
              onChange={lookup.handleSearchChange}
              onKeyDown={handleInputKeyDown}
              onFocus={lookup.handleFocus}
              placeholder="Search by name, email, or phone..."
              className="w-full rounded-lg border border-app-input-border bg-app-input-bg px-4 py-2 text-app-text focus:border-transparent focus:ring-2 focus:ring-app-accent"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={resultsId}
              aria-expanded={lookup.isOpen}
              aria-activedescendant={activeDescendantId}
            />
            {lookup.isLoading ? (
              <div className="absolute right-3 top-[2.65rem] text-sm text-app-text-subtle">
                Searching...
              </div>
            ) : null}
          </div>

          <div
            ref={lookup.dropdownRef}
            id={resultsId}
            className="mt-4 max-h-80 overflow-auto rounded-lg border border-app-border"
            aria-live="polite"
          >
            {lookup.searchTerm.trim().length < 2 ? (
              <div className="p-4 text-sm text-app-text-muted">Type at least 2 characters to search.</div>
            ) : lookup.results.length === 0 ? (
              <div className="p-4 text-sm text-app-text-muted">
                No matches for &quot;{lookup.searchTerm}&quot;.
              </div>
            ) : (
              <ul aria-label="Search results" className="divide-y divide-app-border">
                {lookup.results.map((result, index) => {
                  const isActive = index === activeResultIndex;

                  return (
                    <li key={result.contact_id}>
                      <Link
                        id={`${dialogId}-result-${index}`}
                        to={`/contacts/${result.contact_id}`}
                        data-quick-lookup-result-index={index}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={onClose}
                        onMouseEnter={() => setActiveResultIndex(index)}
                        onFocus={() => setActiveResultIndex(index)}
                        className={`block px-4 py-3 ${
                          isActive
                            ? 'bg-app-accent-soft text-app-text-heading'
                            : 'hover:bg-app-hover'
                        }`}
                      >
                        <div className="font-medium text-app-text">
                          {result.first_name} {result.last_name}
                        </div>
                        <div className="text-sm text-app-text-muted">
                          {result.email || result.mobile_phone || result.phone || 'No contact info'}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Link
              to="/contacts"
              onClick={onClose}
              className="rounded-lg border border-app-border px-4 py-2 text-sm text-app-text hover:bg-app-hover"
            >
              View All People
            </Link>
          </div>
        </div>
      </div>
    </div>,
    portalNode
  );
}
