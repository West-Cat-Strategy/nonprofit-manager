import { Link } from 'react-router-dom';
import EmailSettingsSection from './EmailSettingsSection';

export default function CommunicationsSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-app-text">Communications Hub</h2>
            <p className="max-w-3xl text-sm text-app-text-muted">
              Manage transactional email delivery and keep a clear path to your site newsletter
              workspace. The same email settings panel below powers the admin hub and legacy entry
              points.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/settings/communications"
              className="rounded-md border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-muted"
            >
              Open Communications Hub
            </Link>
            <Link
              to="/websites"
              className="rounded-md border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text transition-colors hover:bg-app-surface-muted"
            >
              Find a website
            </Link>
          </div>
        </div>
      </div>

      <EmailSettingsSection />
    </div>
  );
}
