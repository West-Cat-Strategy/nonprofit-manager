import { Link } from 'react-router-dom';
import { canAccessAdminSettings } from '../../features/auth/state/adminAccess';
import type { NavigationItem } from '../../hooks/useNavigationPreferences';
import Avatar from '../Avatar';
import { classNames } from '../ui/classNames';

export interface NavigationDrawerLink {
  id: string;
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}

interface NavigationDrawerUser {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
  role?: string | null;
}

interface MobileNavigationDrawerProps {
  adminSettingsPath: string;
  alertsLink: NavigationDrawerLink;
  appName: string;
  favoriteItems: NavigationItem[];
  isDarkMode: boolean;
  isNavItemActive: (id: string, path: string) => boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenSearch: () => void;
  onToggleDarkMode: () => void;
  primaryItems: NavigationItem[];
  secondaryItems: NavigationItem[];
  user: NavigationDrawerUser | null;
  utilityNavLinks: NavigationDrawerLink[];
}

export default function MobileNavigationDrawer({
  adminSettingsPath,
  alertsLink,
  appName,
  favoriteItems,
  isDarkMode,
  isNavItemActive,
  onClose,
  onLogout,
  onOpenSearch,
  onToggleDarkMode,
  primaryItems,
  secondaryItems,
  user,
  utilityNavLinks,
}: MobileNavigationDrawerProps) {
  const canOpenAdminSettings = canAccessAdminSettings(user);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto bg-app-surface shadow-xl lg:hidden">
      <div className="flex items-center justify-between border-b border-app-border px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-app-text-heading">{appName}</p>
          <p className="text-xs text-app-text-muted">Staff workspace</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--ui-radius-sm)] p-2 text-app-text-muted transition hover:bg-app-hover hover:text-app-text"
          aria-label="Close menu"
        >
          <svg
            className="h-6 w-6"
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

      <div className="space-y-6 px-4 py-5">
        {favoriteItems.length > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Pinned shortcuts
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {favoriteItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  aria-current={isNavItemActive(item.id, item.path) ? 'page' : undefined}
                  className={classNames(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition',
                    isNavItemActive(item.id, item.path)
                      ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                      : 'border-app-border bg-app-surface text-app-text hover:bg-app-hover'
                  )}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.shortLabel ?? item.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {primaryItems.length > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              Primary
            </p>
            <div className="mt-3 space-y-2">
              {primaryItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  aria-current={isNavItemActive(item.id, item.path) ? 'page' : undefined}
                  className={classNames(
                    'flex items-center gap-3 rounded-[var(--ui-radius-md)] border px-3 py-3 text-sm font-medium transition',
                    isNavItemActive(item.id, item.path)
                      ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                      : 'border-app-border-muted bg-app-surface text-app-text hover:bg-app-hover'
                  )}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {secondaryItems.length > 0 ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
              More
            </p>
            <div className="mt-3 space-y-2">
              {secondaryItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={onClose}
                  aria-current={isNavItemActive(item.id, item.path) ? 'page' : undefined}
                  className={classNames(
                    'flex items-center gap-3 rounded-[var(--ui-radius-md)] border px-3 py-3 text-sm font-medium transition',
                    isNavItemActive(item.id, item.path)
                      ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                      : 'border-app-border-muted bg-app-surface text-app-text hover:bg-app-hover'
                  )}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
            Utilities
          </p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex w-full items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-left text-sm font-medium text-app-text transition hover:bg-app-hover"
            >
              <span aria-hidden="true">🔎</span>
              <span>Search workspace</span>
            </button>
            <Link
              to={alertsLink.path}
              onClick={onClose}
              className="flex items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-sm font-medium text-app-text transition hover:bg-app-hover"
            >
              <span aria-hidden="true">{alertsLink.icon}</span>
              <span>{alertsLink.label}</span>
            </Link>
            {utilityNavLinks.map((link) => (
              <Link
                key={link.id}
                to={link.path}
                onClick={onClose}
                className="flex items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-sm font-medium text-app-text transition hover:bg-app-hover"
              >
                <span aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="flex w-full items-center gap-3 rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface px-3 py-3 text-left text-sm font-medium text-app-text transition hover:bg-app-hover"
            >
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
              <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
            </button>
          </div>
        </section>
      </div>

      <div className="mt-auto border-t border-app-border px-4 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-app-text-subtle">
          Account
        </p>
        <div className="flex items-center gap-3 rounded-[var(--ui-radius-md)] bg-app-surface-muted px-3 py-3">
          <Avatar
            src={user?.profilePicture}
            firstName={user?.firstName ?? undefined}
            lastName={user?.lastName ?? undefined}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-app-text">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-app-text-muted">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          <Link
            to="/settings/user"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
          >
            User Settings
          </Link>
          {canOpenAdminSettings ? (
            <Link
              to={adminSettingsPath}
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-hover"
            >
              Admin Settings
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center rounded-[var(--ui-radius-sm)] border border-app-accent bg-app-accent px-4 py-2 text-sm font-semibold text-[var(--app-accent-foreground)] transition hover:bg-app-accent-hover"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
