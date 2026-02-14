import { Link } from 'react-router-dom';

export default function OtherSettingsSection() {
  return (
    <div className="bg-app-surface rounded-lg shadow-sm border border-app-border overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border bg-app-surface-muted">
        <h2 className="text-lg font-semibold text-app-text">Other Settings</h2>
      </div>
      <ul className="divide-y divide-app-border">
        <li>
          <Link
            to="/settings/backup"
            className="flex items-center justify-between px-6 py-4 hover:bg-app-surface-muted"
          >
            <div className="flex items-center space-x-4">
              <svg className="h-6 w-6 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"
                />
              </svg>
              <div>
                <span className="font-medium text-app-text">Data Backup</span>
                <p className="text-sm text-app-text-muted">Download a backup export</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </li>
        <li>
          <Link
            to="/settings/navigation"
            className="flex items-center justify-between px-6 py-4 hover:bg-app-surface-muted"
          >
            <div className="flex items-center space-x-4">
              <svg className="h-6 w-6 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <div>
                <span className="font-medium text-app-text">Navigation</span>
                <p className="text-sm text-app-text-muted">Customise menu items and order</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </li>
        <li>
          <Link
            to="/settings/api"
            className="flex items-center justify-between px-6 py-4 hover:bg-app-surface-muted"
          >
            <div className="flex items-center space-x-4">
              <svg className="h-6 w-6 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <span className="font-medium text-app-text">API &amp; Integrations</span>
                <p className="text-sm text-app-text-muted">Manage webhooks and API keys</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </li>
        <li>
          <Link
            to="/email-marketing"
            className="flex items-center justify-between px-6 py-4 hover:bg-app-surface-muted"
          >
            <div className="flex items-center space-x-4">
              <svg className="h-6 w-6 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <span className="font-medium text-app-text">Email Marketing</span>
                <p className="text-sm text-app-text-muted">Configure email campaigns and templates</p>
              </div>
            </div>
            <svg className="h-5 w-5 text-app-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </li>
      </ul>
    </div>
  );
}
