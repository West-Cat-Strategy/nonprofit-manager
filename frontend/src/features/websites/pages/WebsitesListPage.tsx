import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import WebsiteConsoleStatePanel from '../components/WebsiteConsoleStatePanel';
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

const getWebsiteActionToneClasses = (tone?: string) =>
  tone === 'primary'
    ? 'bg-app-accent text-[var(--app-accent-foreground)] hover:bg-app-accent-hover'
    : tone === 'warning'
      ? 'bg-amber-600 text-white hover:bg-amber-700'
      : 'bg-slate-700 text-white hover:bg-slate-800';

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

  const currentPage = pagination.page || 1;
  const totalPages = Math.max(pagination.totalPages || 0, 1);
  const rangeStart = pagination.total === 0 ? 0 : (currentPage - 1) * pagination.limit + 1;
  const rangeEnd = pagination.total === 0 ? 0 : Math.min(currentPage * pagination.limit, pagination.total);
  const hasFilterReset = Boolean(
    searchParams.search ||
      searchParams.status ||
      searchParams.sortBy !== 'createdAt' ||
      searchParams.sortOrder !== 'desc'
  );

  const handleRefresh = () => {
    void dispatch(fetchWebsiteSites(searchParams));
  };

  const handleResetFilters = () => {
    dispatch(
      setWebsiteSearchParams({
        search: undefined,
        status: undefined,
        page: 1,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    );
  };

  const handlePageChange = (page: number) => {
    dispatch(setWebsiteSearchParams({ page }));
  };

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
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover"
              >
                Refresh list
              </button>
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
          <div className="mb-6">
            <WebsiteConsoleStatePanel
              tone="error"
              title="Website list unavailable"
              message={error}
              onDismiss={() => dispatch(clearWebsitesError())}
            />
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            <select
              aria-label="Sort websites by"
              value={searchParams.sortBy || 'createdAt'}
              onChange={(event) =>
                dispatch(
                  setWebsiteSearchParams({
                    sortBy: event.target.value as typeof searchParams.sortBy,
                    page: 1,
                  })
                )
              }
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            >
              <option value="createdAt">Newest first</option>
              <option value="publishedAt">Recently published</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
            <select
              aria-label="Sort order"
              value={searchParams.sortOrder || 'desc'}
              onChange={(event) =>
                dispatch(
                  setWebsiteSearchParams({
                    sortOrder: event.target.value as typeof searchParams.sortOrder,
                    page: 1,
                  })
                )
              }
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
              Results
            </div>
            <div className="mt-2 text-3xl font-semibold text-app-text">{pagination.total}</div>
            <p className="mt-2 text-sm text-app-text-muted">
              Showing {rangeStart}-{rangeEnd} of {pagination.total} websites.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1}
                className="rounded-full border border-app-border px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous page
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="rounded-full border border-app-border px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next page
              </button>
            </div>
          </div>
        </div>

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
                      rel="noopener noreferrer"
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${getWebsiteActionToneClasses(
                        spotlightSite.managementSummary.nextAction.tone
                      )}`}
                    >
                      {spotlightSite.managementSummary.nextAction.title}
                    </a>
                  ) : (
                    <Link
                      to={spotlightSite.managementSummary.nextAction.href}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${getWebsiteActionToneClasses(
                        spotlightSite.managementSummary.nextAction.tone
                      )}`}
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

        {isLoading && sitesWithManagement.length === 0 ? (
          <WebsiteConsoleStatePanel
            tone="loading"
            title="Loading websites"
            message="We are fetching the latest staff websites and their readiness summary."
          />
        ) : sitesWithManagement.length === 0 ? (
          <WebsiteConsoleStatePanel
            tone="empty"
            title="No websites match the current view"
            message="Try a different search, status, or sort order. If this workspace is new, you can also open the builder to create a template."
            action={
              <div className="flex flex-wrap gap-3">
                {hasFilterReset ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover"
                  >
                    Clear filters
                  </button>
                ) : null}
                <Link
                  to="/website-builder"
                  className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                >
                  Open Template Builder
                </Link>
              </div>
            }
          />
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
                          Recommended next step
                        </div>
                        <p className="mt-2 text-sm text-app-text-muted">{nextAction.detail}</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {nextAction.href.startsWith('http') ? (
                            <a
                              href={nextAction.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${getWebsiteActionToneClasses(
                                nextAction.tone
                              )}`}
                            >
                              {nextAction.title}
                            </a>
                          ) : (
                            <Link
                              to={nextAction.href}
                              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${getWebsiteActionToneClasses(
                                nextAction.tone
                              )}`}
                            >
                              {nextAction.title}
                            </Link>
                          )}
                          <Link
                            to={`/websites/${site.id}/overview`}
                            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                          >
                            Open Console
                          </Link>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/websites/${site.id}/content`}
                          className="rounded-full border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                        >
                          Content
                        </Link>
                        <Link
                          to={`/websites/${site.id}/forms`}
                          className="rounded-full border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                        >
                          Forms
                        </Link>
                        <Link
                          to={`/websites/${site.id}/integrations`}
                          className="rounded-full border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                        >
                          Integrations
                        </Link>
                        <Link
                          to={`/websites/${site.id}/publishing`}
                          className="rounded-full border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                        >
                          Publishing
                        </Link>
                        <Link
                          to={`/websites/${site.id}/builder`}
                          className="rounded-full border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                        >
                          Builder
                        </Link>
                        {site.previewUrl ? (
                          <a
                            href={site.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-app-border px-3 py-2 text-xs font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                          >
                            Preview
                          </a>
                        ) : null}
                      </div>
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
