import React from 'react';
import { NavLink } from 'react-router-dom';
import type { NavLinkRenderProps } from 'react-router-dom';
import type { WebsiteOverviewSummary } from '../types';
import WebsiteStatusBadge from './WebsiteStatusBadge';

interface WebsiteConsoleLayoutProps {
  siteId: string;
  overview: WebsiteOverviewSummary | null;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'content', label: 'Content' },
  { key: 'forms', label: 'Forms' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'publishing', label: 'Publishing' },
  { key: 'builder', label: 'Builder' },
];

const WebsiteConsoleLayout: React.FC<WebsiteConsoleLayoutProps> = ({
  siteId,
  overview,
  title,
  subtitle,
  actions,
  children,
}) => (
  <div className="min-h-screen bg-app-surface-muted">
    <div className="border-b border-app-border bg-app-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-app-text">{overview?.site.name || 'Website'}</h1>
              {overview ? (
                <WebsiteStatusBadge
                  status={overview.site.status}
                  blocked={overview.site.blocked}
                />
              ) : null}
            </div>
            <p className="text-sm text-app-text-muted">{title}</p>
            {subtitle ? <p className="mt-1 text-sm text-app-text-subtle">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        </div>

        {overview?.site.blocked ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            This site is visible for review but publish, domain, and integration changes stay blocked
            until the organization assignment is fixed.
          </div>
        ) : null}

        <nav className="flex flex-wrap gap-2" aria-label="Website console">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={`/websites/${siteId}/${tab.key}`}
              className={({ isActive }: NavLinkRenderProps) =>
                `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-app-accent text-white'
                    : 'bg-app-surface-muted text-app-text-muted hover:bg-app-input-bg'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>

    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
  </div>
);

export default WebsiteConsoleLayout;
