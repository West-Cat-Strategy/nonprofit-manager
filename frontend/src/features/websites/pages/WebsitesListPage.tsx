import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearWebsitesError,
  fetchWebsiteSites,
  setWebsiteSearchParams,
} from '../state';
import WebsiteStatusBadge from '../components/WebsiteStatusBadge';

const WebsitesListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sites, searchParams, pagination, isLoading, error } = useAppSelector(
    (state) => state.websites
  );

  useEffect(() => {
    void dispatch(fetchWebsiteSites());
  }, [dispatch, searchParams]);

  return (
    <div className="min-h-screen bg-app-surface-muted">
      <div className="border-b border-app-border bg-app-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-app-text">Websites</h1>
              <p className="mt-1 text-sm text-app-text-muted">
                Manage live organization sites, content, forms, integrations, and publishing.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/website-builder"
                className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
              >
                Open Template Builder
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
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
                    status: event.target.value ? (event.target.value as typeof searchParams.status) : undefined,
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

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-app-border bg-app-surface p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">Sites</div>
            <div className="mt-2 text-3xl font-semibold text-app-text">{pagination.total}</div>
          </div>
          <div className="rounded-3xl border border-app-border bg-app-surface p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">Published</div>
            <div className="mt-2 text-3xl font-semibold text-app-text">
              {sites.filter((site) => site.status === 'published').length}
            </div>
          </div>
          <div className="rounded-3xl border border-app-border bg-app-surface p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">Blocked</div>
            <div className="mt-2 text-3xl font-semibold text-app-text">
              {sites.filter((site) => site.blocked).length}
            </div>
          </div>
          <div className="rounded-3xl border border-app-border bg-app-surface p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">Pages</div>
            <div className="mt-2 text-sm text-app-text-muted">
              Existing org-scoped sites are all managed here.
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-3xl border border-app-border bg-app-surface p-8 text-center text-app-text-muted">
              Loading websites...
            </div>
          ) : sites.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-app-border bg-app-surface p-8 text-center text-app-text-muted">
              No websites match the current filters.
            </div>
          ) : (
            sites.map((site) => (
              <article
                key={site.id}
                className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-app-text">{site.name}</h2>
                      <WebsiteStatusBadge status={site.status} blocked={site.blocked} />
                      <span className="rounded-full bg-app-surface-muted px-3 py-1 text-xs font-medium text-app-text-muted">
                        {site.siteKind}
                      </span>
                    </div>
                    <p className="text-sm text-app-text-muted">
                      Template: <span className="font-medium text-app-text">{site.templateName}</span>
                      {site.organizationName ? (
                        <>
                          {' '}
                          • Organization:{' '}
                          <span className="font-medium text-app-text">{site.organizationName}</span>
                        </>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-app-text-muted">
                      <span>Primary URL: {site.primaryUrl}</span>
                      {site.subdomain ? <span>Subdomain: {site.subdomain}</span> : null}
                      {site.customDomain ? <span>Domain: {site.customDomain}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
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
                      Open Builder
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsitesListPage;
