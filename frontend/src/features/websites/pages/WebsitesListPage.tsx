import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearWebsitesError,
  fetchWebsiteSites,
  setWebsiteSearchParams,
} from '../state';
import WebsiteStatusBadge from '../components/WebsiteStatusBadge';
import {
  deriveWebsiteSiteManagementSummary,
  formatWebsiteConsoleDate,
} from '../lib/websiteConsole';

const WebsitesListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sites, searchParams, pagination, isLoading, error } = useAppSelector(
    (state) => state.websites
  );

  useEffect(() => {
    void dispatch(fetchWebsiteSites());
  }, [dispatch, searchParams]);

  const sitesWithManagement = useMemo(
    () =>
      sites.map((site) => ({
        ...site,
        managementSummary: site.managementSummary ?? deriveWebsiteSiteManagementSummary(site),
      })),
    [sites]
  );

  const dashboardSummary = useMemo(() => {
    const publishedSites = sitesWithManagement.filter((site) => site.status === 'published');
    const readySites = sitesWithManagement.filter(
      (site) => site.managementSummary.status === 'healthy'
    );
    const attentionSites = sitesWithManagement.filter(
      (site) => site.managementSummary.status === 'attention'
    );
    const blockedSites = sitesWithManagement.filter(
      (site) => site.managementSummary.status === 'blocked'
    );
    return {
      publishedSites: publishedSites.length,
      readySites: readySites.length,
      attentionSites: attentionSites.length,
      blockedSites: blockedSites.length,
    };
  }, [sitesWithManagement]);

  const spotlightSite = useMemo(
    () =>
      sitesWithManagement.find((site) => site.managementSummary.status === 'blocked') ??
      sitesWithManagement.find((site) => site.managementSummary.status === 'attention') ??
      sitesWithManagement[0] ??
      null,
    [sitesWithManagement]
  );

  return (
    <div className="min-h-screen bg-app-surface-muted">
      <div className="border-b border-app-border bg-app-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-app-text-subtle">
                Websites module
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-app-text">Websites</h1>
              <p className="mt-2 text-sm text-app-text-muted">
                Manage live sites, site health, content, forms, integrations, and publishing from
                one staff workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/website-builder"
                className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
              >
                Open Template Builder
              </Link>
              <Link
                to="/websites"
                className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover"
              >
                Refresh module
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-app-border bg-app-surface-elevated p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Sites
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">{pagination.total}</div>
              <p className="mt-2 text-sm text-app-text-muted">All org-scoped websites in the workspace.</p>
            </div>
            <div className="rounded-3xl border border-app-border bg-app-surface-elevated p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Ready
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {dashboardSummary.readySites}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Sites that already have a healthy management summary.
              </p>
            </div>
            <div className="rounded-3xl border border-app-border bg-app-surface-elevated p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Needs attention
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {dashboardSummary.attentionSites}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Sites with missing readiness items or incomplete setup.
              </p>
            </div>
            <div className="rounded-3xl border border-app-border bg-app-surface-elevated p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Blocked
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {dashboardSummary.blockedSites}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Sites waiting on an organization assignment or review.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <div className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => dispatch(clearWebsitesError())}
                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {spotlightSite ? (
          <section className="mb-6 rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                  Next action
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-app-text">{spotlightSite.name}</h2>
                  <WebsiteStatusBadge
                    status={spotlightSite.status}
                    blocked={spotlightSite.blocked}
                  />
                  <span className="rounded-full bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                    {spotlightSite.templateName}
                  </span>
                </div>
                <p className="mt-3 text-sm text-app-text-muted">
                  {spotlightSite.managementSummary.nextAction.detail}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {spotlightSite.managementSummary.nextAction.href.startsWith('http') ? (
                    <a
                      href={spotlightSite.managementSummary.nextAction.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-full px-4 py-2 text-sm font-medium text-white transition-colors ${
                        spotlightSite.managementSummary.nextAction.tone === 'primary'
                          ? 'bg-app-accent hover:bg-app-accent-hover'
                          : spotlightSite.managementSummary.nextAction.tone === 'warning'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {spotlightSite.managementSummary.nextAction.title}
                    </a>
                  ) : (
                    <Link
                      to={spotlightSite.managementSummary.nextAction.href}
                      className={`rounded-full px-4 py-2 text-sm font-medium text-white transition-colors ${
                        spotlightSite.managementSummary.nextAction.tone === 'primary'
                          ? 'bg-app-accent hover:bg-app-accent-hover'
                          : spotlightSite.managementSummary.nextAction.tone === 'warning'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : 'bg-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {spotlightSite.managementSummary.nextAction.title}
                    </Link>
                  )}
                  <Link
                    to={`/websites/${spotlightSite.id}/overview`}
                    className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                  >
                    Open Console
                  </Link>
                  <Link
                    to={`/websites/${spotlightSite.id}/builder`}
                    className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                  >
                    Open Builder
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[30rem] xl:grid-cols-2">
                {([
                  ['Publish', spotlightSite.managementSummary.readiness.publish],
                  ['Domain', spotlightSite.managementSummary.readiness.domain],
                  ['Preview', spotlightSite.managementSummary.readiness.preview],
                  ['SSL', spotlightSite.managementSummary.readiness.ssl],
                  ['Analytics', spotlightSite.managementSummary.readiness.analytics],
                ] as const).map(([label, ready]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                      {label}
                    </div>
                    <div
                      className={`mt-2 text-lg font-semibold ${
                        ready ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {ready ? 'Ready' : 'Needs work'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <div className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <input
            type="text"
            aria-label="Search websites"
            value={searchParams.search || ''}
            onChange={(event) =>
              dispatch(setWebsiteSearchParams({ search: event.target.value, page: 1 }))
            }
            placeholder="Search websites, domains, or templates"
            className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
          />
          <select
            aria-label="Filter websites by status"
            value={searchParams.status || ''}
            onChange={(event) =>
              dispatch(
                setWebsiteSearchParams({
                  status: event.target.value
                    ? (event.target.value as typeof searchParams.status)
                    : undefined,
                  page: 1,
                })
              )
            }
            className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="maintenance">Maintenance</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-app-border bg-app-surface p-8 text-center text-app-text-muted">
            Loading websites...
          </div>
        ) : sitesWithManagement.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-app-border bg-app-surface p-8 text-center text-app-text-muted">
            No websites match the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {sitesWithManagement.map((site) => {
              const summary = site.managementSummary;
              const nextAction = summary.nextAction;

              return (
                <article
                  key={site.id}
                  className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-app-text">{site.name}</h2>
                        <WebsiteStatusBadge status={site.status} blocked={site.blocked} />
                        <span className="rounded-full bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                          {site.siteKind}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            summary.status === 'healthy'
                              ? 'bg-emerald-100 text-emerald-800'
                              : summary.status === 'blocked'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {summary.status === 'healthy' ? 'Ready' : summary.status}
                        </span>
                      </div>

                      <p className="text-sm text-app-text-muted">
                        Template: <span className="font-medium text-app-text">{site.templateName}</span>
                        {site.organizationName ? (
                          <>
                            {' '}
                            • Organization:{' '}
                            <span className="font-medium text-app-text">
                              {site.organizationName}
                            </span>
                          </>
                        ) : null}
                      </p>

                      <div className="flex flex-wrap gap-3 text-sm text-app-text-muted">
                        <span>Primary URL: {site.primaryUrl}</span>
                        {site.subdomain ? <span>Subdomain: {site.subdomain}</span> : null}
                        {site.customDomain ? <span>Domain: {site.customDomain}</span> : null}
                        <span>Updated {formatWebsiteConsoleDate(site.updatedAt)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {([
                          ['Publish', summary.readiness.publish],
                          ['Preview', summary.readiness.preview],
                          ['Domain', summary.readiness.domain],
                          ['SSL', summary.readiness.ssl],
                          ['Analytics', summary.readiness.analytics],
                        ] as const).map(([label, ready]) => (
                          <span
                            key={label}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              ready
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {label}: {ready ? 'ready' : 'needs work'}
                          </span>
                        ))}
                        <span className="rounded-full bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                          Attention items: {summary.attentionCount}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                          Next action
                        </div>
                        <p className="mt-2 text-sm text-app-text-muted">{nextAction.detail}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:max-w-[26rem] lg:justify-end">
                      <Link
                        to={`/websites/${site.id}/overview`}
                        className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover"
                      >
                        Open Console
                      </Link>
                      <Link
                        to={`/websites/${site.id}/builder`}
                        className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                      >
                        Builder
                      </Link>
                      <Link
                        to={`/websites/${site.id}/content`}
                        className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                      >
                        Content
                      </Link>
                      <Link
                        to={`/websites/${site.id}/forms`}
                        className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                      >
                        Forms
                      </Link>
                      <Link
                        to={`/websites/${site.id}/integrations`}
                        className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                      >
                        Integrations
                      </Link>
                      <Link
                        to={`/websites/${site.id}/publishing`}
                        className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                      >
                        Publishing
                      </Link>
                      {site.previewUrl ? (
                        <a
                          href={site.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                        >
                          Preview
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsitesListPage;
