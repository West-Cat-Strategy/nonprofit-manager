import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { classNames } from './classNames';

export interface SideNavItem {
  key: string;
  label: string;
  to: string;
  icon?: ReactNode;
  isActive?: boolean;
}

interface SideNavProps {
  items: SideNavItem[];
  title?: string;
  footer?: ReactNode;
  className?: string;
  onNavigate?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export default function SideNav({
  items,
  title = 'Navigation',
  footer,
  className,
  onNavigate,
  searchable = false,
  searchPlaceholder = 'Search sections',
  emptyMessage = 'No matching sections',
}: SideNavProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const visibleItems = useMemo(() => {
    if (!searchable) {
      return items;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) => item.label.toLowerCase().includes(normalizedSearch));
  }, [items, searchable, searchTerm]);

  return (
    <aside
      className={classNames(
        'rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface-elevated p-3 shadow-sm',
        className
      )}
      aria-label={title}
    >
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-app-text-label">
        {title}
      </p>
      {searchable ? (
        <div className="mb-3 px-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-app-input-border bg-app-input-bg px-2.5 py-2 text-sm text-app-text placeholder:text-app-text-subtle focus:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent-soft"
            aria-label={`${title} search`}
          />
        </div>
      ) : null}
      <nav aria-label={title}>
        <ul className="space-y-1">
          {visibleItems.map((item) => (
            <li key={item.key}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={classNames(
                  'flex items-center gap-2 rounded-[var(--ui-radius-sm)] border px-3 py-2 text-sm font-semibold transition-colors',
                  item.isActive
                    ? 'app-accent-contrast-ink border-app-accent bg-app-accent shadow-sm'
                    : 'border-transparent text-app-text hover:border-app-border hover:bg-app-surface-muted hover:text-app-text-heading'
                )}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {searchable && visibleItems.length === 0 ? (
        <p className="px-2 pt-2 text-xs text-app-text-subtle">{emptyMessage}</p>
      ) : null}
      {footer && <div className="mt-3 border-t border-app-border pt-3">{footer}</div>}
    </aside>
  );
}
