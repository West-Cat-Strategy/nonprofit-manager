import { Link, useLocation } from 'react-router-dom';
import { BellAlertIcon, ClockIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { normalizeStartupRouteLocation } from '../../../routes/startupRouteCatalog';
import { classNames } from '../../../components/ui/classNames';

const alertTabs = [
  { href: '/alerts', label: 'Alert rules', Icon: ClipboardDocumentListIcon },
  { href: '/alerts/instances', label: 'Active alerts', Icon: BellAlertIcon },
  { href: '/alerts/history', label: 'Alert history', Icon: ClockIcon },
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
          const TabIcon = tab.Icon;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={classNames(
                'inline-flex items-center gap-2 rounded-[var(--ui-radius-sm)] px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-app-accent-soft text-app-accent-text'
                  : 'text-app-text-muted hover:-translate-y-0.5 hover:bg-app-hover hover:text-app-text'
              )}
            >
              <TabIcon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
