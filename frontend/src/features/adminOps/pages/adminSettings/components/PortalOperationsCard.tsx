import { Link } from 'react-router-dom';
import { getPortalAdminPath } from '../../../adminRoutePaths';

const portalLinks = [
  { label: 'Access', to: getPortalAdminPath('access') },
  { label: 'Users', to: getPortalAdminPath('users') },
  { label: 'Conversations', to: getPortalAdminPath('conversations') },
  { label: 'Appointments', to: getPortalAdminPath('appointments') },
  { label: 'Slots', to: getPortalAdminPath('slots') },
];

export default function PortalOperationsCard() {
  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-app-text-heading">Portal Operations</h3>
          <p className="text-sm text-app-text-muted">
            Portal tooling now runs in dedicated pages for access, users, conversations,
            appointments, and slots.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {portalLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded bg-app-surface-muted px-3 py-2 text-sm hover:bg-app-hover"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
