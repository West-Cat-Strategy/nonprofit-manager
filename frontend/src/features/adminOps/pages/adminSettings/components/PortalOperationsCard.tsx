import { Link } from 'react-router-dom';
import { getPortalAdminPath } from '../../../adminRoutePaths';
import {
  AdminStatusPill,
  AdminWorkspaceSection,
} from '../../../components/AdminWorkspacePrimitives';

const portalLinks = [
  { label: 'Access', to: getPortalAdminPath('access') },
  { label: 'Users', to: getPortalAdminPath('users') },
  { label: 'Conversations', to: getPortalAdminPath('conversations') },
  { label: 'Appointments', to: getPortalAdminPath('appointments') },
  { label: 'Slots', to: getPortalAdminPath('slots') },
];

export default function PortalOperationsCard() {
  return (
    <AdminWorkspaceSection
      title="Portal Operations"
      description="Triage client portal access, conversations, appointments, availability, and portal user support from dedicated queue pages."
      actions={<AdminStatusPill tone="info">Dedicated workspace</AdminStatusPill>}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {portalLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-[var(--ui-radius-sm)] border border-app-border bg-app-surface-muted px-3 py-2 text-sm font-semibold text-app-text hover:bg-app-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-sm text-app-text-muted lg:max-w-xs">
          Use these queues when the next action depends on urgency rather than a general settings
          section.
        </p>
      </div>
    </AdminWorkspaceSection>
  );
}
