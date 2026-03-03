import type { ReactNode } from 'react';
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
}

export default function SideNav({ items, title = 'Navigation', footer, className, onNavigate }: SideNavProps) {
  return (
    <aside
      className={classNames(
        'rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-3 shadow-sm',
        className
      )}
      aria-label={title}
    >
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-app-text-subtle">{title}</p>
      <nav>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={classNames(
                  'flex items-center gap-2 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-medium transition-colors',
                  item.isActive
                    ? 'bg-app-accent-soft text-app-accent-text'
                    : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
                )}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {footer && <div className="mt-3 border-t border-app-border-muted pt-3">{footer}</div>}
    </aside>
  );
}
