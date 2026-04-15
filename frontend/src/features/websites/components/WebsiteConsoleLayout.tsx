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
  { key: 'newsletters', label: 'Newsletters' },
  { key: 'forms', label: 'Forms' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'publishing', label: 'Publishing' },
  { key: 'builder', label: 'Builder' },
];

const formatConsoleDate = (value?: string | null): string => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const WebsiteConsoleLayout: React.FC<WebsiteConsoleLayoutProps> = ({
  siteId,
  overview,
  title,
  subtitle,
  actions,
  children,
}) => (
  <div className="min-h-screen bg-app-bg text-app-text transition-colors">
    <div className="border-b border-app-border/80 bg-app-surface/95 backdrop-blur supports-[backdrop-filter]:bg-app-surface/85">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-app-text">
                {overview?.site.name || 'Website'}
              </h1>
              {overview ? (
                <WebsiteStatusBadge status={overview.site.status} blocked={overview.site.blocked} />
              ) : null}
            </div>
            <p className="mt-2 max-w-3xl text-sm text-app-text-muted">{title}</p>
            {subtitle ? <p className="mt-1 max-w-3xl text-sm text-app-text-subtle">{subtitle}</p> : null}

            {overview ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-app-border bg-app-surface px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Site status
                  </div>
                  <div className="mt-2 text-sm font-semibold text-app-text">
                    {overview.site.blocked ? 'Needs assignment' : overview.site.status}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {overview.site.publishedVersion ? `Version ${overview.site.publishedVersion}` : 'Draft site'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Live URL
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-app-text">
                    {overview.deployment?.primaryUrl || overview.site.primaryUrl || 'Not available'}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {overview.deployment?.domainStatus === 'configured' ? 'Custom domain configured' : 'Default routing'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Preview
                  </div>
                  <div className="mt-2 text-sm font-semibold text-app-text">
                    {overview.deployment?.previewUrl ? 'Preview available' : 'No preview deployment'}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {overview.deployment?.previewUrl || 'Publish a preview to share a private review link.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Updated
                  </div>
                  <div className="mt-2 text-sm font-semibold text-app-text">
                    {formatConsoleDate(overview.site.updatedAt)}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Published {formatConsoleDate(overview.site.publishedAt)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">{actions}</div>
        </div>

        {overview?.site.blocked ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            This site is visible for review, but publish, domain, and integration changes stay
            blocked until the organization assignment is fixed.
          </div>
        ) : null}

        <nav
          className="mt-5 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap"
          aria-label="Website console"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={`/websites/${siteId}/${tab.key}`}
              className={({ isActive }: NavLinkRenderProps) =>
                `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'app-pill-action app-pill-action-accent app-accent-contrast-ink shadow-sm'
                    : 'app-pill-action'
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
