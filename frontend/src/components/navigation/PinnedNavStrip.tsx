import { Link } from 'react-router-dom';
import type { NavigationItem } from '../../hooks/useNavigationPreferences';
import { classNames } from '../ui/classNames';

interface PinnedNavStripProps {
  items: NavigationItem[];
  isActive: (path: string) => boolean;
  onUnpin?: (itemId: string) => void;
  compact?: boolean;
  className?: string;
}

export default function PinnedNavStrip({
  items,
  isActive,
  onUnpin,
  compact = false,
  className,
}: PinnedNavStripProps) {
  if (items.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={classNames('space-y-2', className)} data-testid="mobile-pinned-nav">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-app-text-subtle">Pinned</p>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Link
              to={item.path}
              className={classNames(
                'flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.path)
                  ? 'bg-app-accent-soft text-app-accent-text'
                  : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
              )}
            >
              <span aria-hidden="true" className="text-base">
                {item.icon}
              </span>
              <span>{item.shortLabel ?? item.name}</span>
            </Link>
            {onUnpin ? (
              <button
                type="button"
                onClick={() => onUnpin(item.id)}
                className="rounded-md p-2 text-app-text-subtle hover:bg-app-hover hover:text-app-text"
                aria-label={`Unpin ${item.name}`}
                title={`Unpin ${item.name}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={classNames('hidden xl:flex items-center gap-1.5', className)} data-testid="desktop-pinned-nav">
      {items.map((item) => (
        <div key={item.id} className="flex items-center">
          <Link
            to={item.path}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors',
              isActive(item.path)
                ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                : 'border-app-border text-app-text-muted hover:bg-app-hover hover:text-app-text'
            )}
            aria-label={`Pinned: ${item.ariaLabel ?? item.name}`}
            title={`Pinned: ${item.name}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.shortLabel ?? item.name}</span>
            <span aria-hidden="true">📌</span>
          </Link>
          {onUnpin ? (
            <button
              type="button"
              onClick={() => onUnpin(item.id)}
              className="ml-1 rounded p-1 text-app-text-subtle hover:bg-app-hover hover:text-app-text"
              aria-label={`Unpin ${item.name}`}
              title={`Unpin ${item.name}`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
