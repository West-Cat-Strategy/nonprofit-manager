import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  WebsiteConsoleLayout,
  WebsiteManagedFormVerificationPanel,
  WebsiteConsoleNotice,
  WebsiteConsoleStatePanel,
  WebsiteConsoleUrlAction,
} from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import {
  deriveWebsiteManagedFormVerification,
  deriveWebsiteManagementSnapshot,
  formatWebsiteConsoleDate,
  getWebsiteConsoleUrlTarget,
} from '../lib/websiteConsole';
import { getWebsiteContentPath } from '../lib/websiteRouteTargets';
import {
  clearWebsitesError,
  fetchWebsiteDeployment,
  fetchWebsiteOverview,
  fetchWebsiteVersions,
  invalidateWebsiteCache,
  publishWebsiteSite,
  rollbackWebsiteVersion,
  unpublishWebsiteSite,
  updateWebsiteSite,
} from '../state';

const WebsitePublishingPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const { deployment, versions, lastPublishResult, isSaving, isLoading, error } = useAppSelector(
    (state) => state.websites
  );
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [publishTarget, setPublishTarget] = useState<'live' | 'preview'>('live');
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteDeployment(siteId));
    void dispatch(fetchWebsiteVersions({ siteId, limit: 10 }));
  }, [dispatch, siteId]);

  useEffect(() => {
    if (!overview) return;
    setName(overview.site.name);
    setSubdomain(overview.site.subdomain || '');
    setCustomDomain(overview.site.customDomain || '');
  }, [overview]);

  if (!siteId) {
    return null;
  }

  const managementSnapshot = overview?.managementSnapshot ?? deriveWebsiteManagementSnapshot(overview);
  const managedFormVerification = deriveWebsiteManagedFormVerification(overview);
  const deploymentInfo = overview?.deployment || {
    primaryUrl: overview?.site.primaryUrl || '',
    previewUrl: null,
    domainStatus: 'none' as const,
    sslStatus: 'unconfigured' as const,
  };
  const liveSiteHref = getWebsiteConsoleUrlTarget(deploymentInfo);

  const saveSiteSettings = async () => {
    if (!overview) return;
    setNotice(null);
    const result = await dispatch(
      updateWebsiteSite({
        siteId,
        data: {
          name,
          subdomain: subdomain || null,
          customDomain: customDomain || null,
        },
      })
    );
    if (updateWebsiteSite.fulfilled.match(result)) {
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      void dispatch(fetchWebsiteDeployment(siteId));
      setNotice({ tone: 'success', message: 'Site settings saved.' });
    } else {
      setNotice({
        tone: 'error',
        message: typeof result.payload === 'string' ? result.payload : 'Failed to save site settings.',
      });
    }
  };

  const publish = async () => {
    if (!overview) return;
    setNotice(null);
    const result = await dispatch(
      publishWebsiteSite({
        siteId,
        templateId: overview.template.id || overview.site.templateId,
        target: publishTarget,
      })
    );
    if (publishWebsiteSite.fulfilled.match(result)) {
      void dispatch(fetchWebsiteDeployment(siteId));
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      void dispatch(fetchWebsiteVersions({ siteId, limit: 10 }));
      setNotice({
        tone: 'success',
        message:
          result.payload.target === 'preview'
            ? `Preview published. Use ${result.payload.previewUrl || 'the preview link'} to review it.`
            : 'Latest template published.',
      });
    } else {
      setNotice({
        tone: 'error',
        message: typeof result.payload === 'string' ? result.payload : 'Failed to publish site.',
      });
    }
  };

  const unpublish = async () => {
    setNotice(null);
    const result = await dispatch(unpublishWebsiteSite(siteId));
    if (unpublishWebsiteSite.fulfilled.match(result)) {
      void dispatch(fetchWebsiteDeployment(siteId));
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      setNotice({ tone: 'success', message: 'Site moved back to draft.' });
    } else {
      setNotice({
        tone: 'error',
        message: typeof result.payload === 'string' ? result.payload : 'Failed to unpublish site.',
      });
    }
  };

  const refreshCache = async () => {
    setNotice(null);
    const result = await dispatch(invalidateWebsiteCache(siteId));
    if (invalidateWebsiteCache.fulfilled.match(result)) {
      setNotice({ tone: 'success', message: 'Live site cache refreshed.' });
    } else {
      setNotice({
        tone: 'error',
        message: typeof result.payload === 'string' ? result.payload : 'Failed to refresh cache.',
      });
    }
  };

  const rollbackVersion = async (version: string) => {
    setNotice(null);
    const result = await dispatch(rollbackWebsiteVersion({ siteId, version }));
    if (rollbackWebsiteVersion.fulfilled.match(result)) {
      void dispatch(fetchWebsiteDeployment(siteId));
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      void dispatch(fetchWebsiteVersions({ siteId, limit: 10 }));
      setNotice({ tone: 'success', message: result.payload.message });
    } else {
      setNotice({
        tone: 'error',
        message: typeof result.payload === 'string' ? result.payload : 'Failed to roll back version.',
      });
    }
  };

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Manage publish/unpublish, the one-form verification loop, domains, and live-cache refresh."
      subtitle="Use the same publishing workspace to confirm preview/live URLs and the public submission contract before you share the site."
      actions={
        <div className="flex flex-wrap gap-3">
          <WebsiteConsoleUrlAction
            href={liveSiteHref}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
            disabledTitle="Live site is unavailable until the website has a public URL."
          >
            Open live site
          </WebsiteConsoleUrlAction>
          <Link
            to={getWebsiteContentPath(siteId)}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Review content
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <WebsiteConsoleStatePanel
            tone="error"
            title="Website publishing unavailable"
            message={error}
            onDismiss={() => dispatch(clearWebsitesError())}
          />
        ) : null}
        {notice ? (
          <WebsiteConsoleNotice
            tone={notice.tone}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        ) : null}

        {isLoading && !overview ? (
          <WebsiteConsoleStatePanel
            tone="loading"
            title="Loading publishing status"
            message="We are fetching the live deployment, domain state, and cache status."
          />
        ) : null}

        {!isLoading && !overview ? (
          <WebsiteConsoleStatePanel
            tone="empty"
            title="Publishing data is unavailable"
            message="Refresh the page or retry after the website overview finishes loading."
          />
        ) : null}

        {overview ? (
          <>
            <WebsiteManagedFormVerificationPanel
              siteId={siteId}
              summary={managedFormVerification}
              title="Managed form publish verification"
              description="Use one managed public form as the concrete publish proof: confirm preview/live reachability, inspect the submission endpoint, and verify the public runtime before or after a release."
            />

            <section className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Publish readiness
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-app-text">
                    {managementSnapshot?.nextAction.title || 'Review publish settings'}
                  </h2>
                  <p className="mt-2 text-sm text-app-text-muted">
                    {managementSnapshot?.nextAction.detail ||
                      'Check routing, domain configuration, and cache state before publishing.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-app-surface-muted px-3 py-1 text-sm font-medium text-app-text-muted">
                    Status: {managementSnapshot?.status || overview.site.status}
                  </span>
                  <span className="rounded-full bg-app-surface-muted px-3 py-1 text-sm font-medium text-app-text-muted">
                    Version: {overview.site.publishedVersion || 'draft'}
                  </span>
                  <span className="rounded-full bg-app-surface-muted px-3 py-1 text-sm font-medium text-app-text-muted">
                    Updated {formatWebsiteConsoleDate(managementSnapshot?.lastUpdatedAt || overview.site.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Publish
                  </div>
                  <div className="mt-2 text-lg font-semibold text-app-text">
                    {managementSnapshot?.readiness.publish ? 'Ready' : 'Needs work'}
                  </div>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Domain
                  </div>
                  <div className="mt-2 text-lg font-semibold text-app-text">
                    {managementSnapshot?.readiness.domain ? 'Configured' : 'Missing'}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {deploymentInfo.domainStatus === 'configured'
                      ? 'Primary site domain is attached.'
                      : 'Add a subdomain or custom domain.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    SSL
                  </div>
                  <div className="mt-2 text-lg font-semibold text-app-text capitalize">
                    {deploymentInfo.sslStatus}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {overview.site.customDomain ? 'Secure traffic for the live domain.' : 'Not required without a custom domain.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Preview
                  </div>
                  <div className="mt-2 text-lg font-semibold text-app-text">
                    {managementSnapshot?.readiness.preview ? 'Available' : 'Unavailable'}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {deploymentInfo.previewUrl || deploymentInfo.primaryUrl}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-3xl border border-app-border bg-app-surface p-5">
                <h2 className="text-lg font-semibold text-app-text">Site identity and domains</h2>
                <div className="mt-4 grid gap-4">
                  <input
                    type="text"
                    aria-label="Website site name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Site name"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <input
                    type="text"
                    aria-label="Website subdomain"
                    value={subdomain}
                    onChange={(event) => setSubdomain(event.target.value)}
                    placeholder="Subdomain"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <input
                    type="text"
                    aria-label="Website custom domain"
                    value={customDomain}
                    onChange={(event) => setCustomDomain(event.target.value)}
                    placeholder="Custom domain"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveSiteSettings}
                    disabled={isSaving || overview.site.blocked}
                    className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save site settings
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-app-border bg-app-surface p-5">
                <h2 className="text-lg font-semibold text-app-text">Publishing controls</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                      Primary URL
                    </div>
                    <div className="mt-2 text-sm text-app-text">
                      {deployment?.primaryUrl || deploymentInfo.primaryUrl}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                      Preview URL
                    </div>
                    <div className="mt-2 text-sm text-app-text">
                      {deploymentInfo.previewUrl || 'No preview deployment available.'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                      Publish target
                    </span>
                    <select
                      value={publishTarget}
                      onChange={(event) => setPublishTarget(event.target.value as 'live' | 'preview')}
                      className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                    >
                      <option value="live">Live publish</option>
                      <option value="preview">Preview publish</option>
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={publish}
                    disabled={isSaving || overview.site.blocked}
                    className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {publishTarget === 'preview' ? 'Publish preview' : 'Publish live'}
                  </button>
                  <button
                    type="button"
                    onClick={unpublish}
                    disabled={isSaving || overview.site.blocked}
                    className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    onClick={refreshCache}
                    disabled={isSaving}
                    className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Refresh cache
                  </button>
                </div>
                </div>

                {lastPublishResult ? (
                  <div className="mt-4 rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                      Last publish
                    </div>
                    <div className="mt-2 text-sm text-app-text">
                      {lastPublishResult.target === 'preview'
                        ? 'Preview deployment created.'
                        : 'Live deployment updated.'}
                    </div>
                    <div className="mt-1 text-sm text-app-text-muted">
                      Version {lastPublishResult.version}
                    </div>
                    {lastPublishResult.previewUrl ? (
                      <a
                        href={lastPublishResult.previewUrl}
                        className="mt-3 inline-flex text-sm font-medium text-app-accent"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open preview link
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-app-border bg-app-surface p-5">
                <h2 className="text-lg font-semibold text-app-text">Version history</h2>
                <p className="mt-2 text-sm text-app-text-muted">
                  Roll back to a previous publish version or inspect the latest live snapshots.
                </p>
                <div className="mt-4 space-y-3">
                  {versions?.versions?.length ? (
                    versions.versions.map((version) => (
                      <div
                        key={version.id}
                        className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-app-text">
                              {version.version}
                              {version.isCurrent ? (
                                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                  Current
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm text-app-text-muted">
                              {formatWebsiteConsoleDate(version.publishedAt)}
                            </div>
                            <div className="mt-1 text-sm text-app-text-muted">
                              {version.changeDescription || 'No change description provided.'}
                            </div>
                          </div>
                          {!version.isCurrent ? (
                            <button
                              type="button"
                              onClick={() => rollbackVersion(version.version)}
                              disabled={isSaving}
                              className="rounded-full border border-app-border px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Roll back
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <WebsiteConsoleStatePanel
                      tone="empty"
                      title="No version history yet"
                      message="Publish the site to start tracking live and preview versions."
                    />
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-app-border bg-app-surface p-5">
              <h2 className="text-lg font-semibold text-app-text">Live route summary</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {overview.liveRoutes.map((route) => (
                  <div
                    key={`${route.pageId}-${route.path}`}
                    className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                  >
                    <div className="font-medium text-app-text">{route.pageName}</div>
                    <div className="text-sm text-app-text-muted">{route.path}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </WebsiteConsoleLayout>
  );
};

export default WebsitePublishingPage;
