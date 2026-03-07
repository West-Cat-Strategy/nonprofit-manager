import { Link, useLocation } from 'react-router-dom';
import { normalizeStartupRouteLocation } from '../../../routes/startupRouteCatalog';
import { classNames } from '../../../components/ui/classNames';

const alertTabs = [
  { href: '/alerts', label: 'Configuration' },
  { href: '/alerts/instances', label: 'Triggered Alerts' },
  { href: '/alerts/history', label: 'History' },
];

export default function AlertsSectionTabs() {
  const location = useLocation();
  const currentLocation = normalizeStartupRouteLocation(`${location.pathname}${location.search}`);

  return (
    <nav
      aria-label="Alerts sections"
      className="rounded-[var(--ui-radius-md)] border border-app-border-muted bg-app-surface p-2 shadow-sm"
    >
      <div className="flex flex-wrap gap-2">
        {alertTabs.map((tab) => {
          const isActive = currentLocation === normalizeStartupRouteLocation(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={classNames(
                'inline-flex items-center rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-app-accent-soft text-app-accent-text'
                  : 'text-app-text-muted hover:bg-app-hover hover:text-app-text'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
