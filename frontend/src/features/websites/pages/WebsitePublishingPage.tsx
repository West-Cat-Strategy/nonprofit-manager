import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { WebsiteConsoleLayout, WebsiteConsoleNotice } from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import {
  clearWebsitesError,
  fetchWebsiteDeployment,
  fetchWebsiteOverview,
  invalidateWebsiteCache,
  publishWebsiteSite,
  unpublishWebsiteSite,
  updateWebsiteSite,
} from '../state';

const WebsitePublishingPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const { deployment, isSaving, isLoading, error } = useAppSelector((state) => state.websites);
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteDeployment(siteId));
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
      })
    );
    if (publishWebsiteSite.fulfilled.match(result)) {
      void dispatch(fetchWebsiteDeployment(siteId));
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      setNotice({ tone: 'success', message: 'Latest template published.' });
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

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Manage publish/unpublish, routing targets, domains, and live-cache refresh."
    >
      <div className="space-y-6">
        {error ? (
          <WebsiteConsoleNotice
            tone="error"
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
          <div className="rounded-3xl border border-app-border bg-app-surface p-8 text-center text-app-text-muted">
            Loading publishing status...
          </div>
        ) : null}

        {!isLoading && !overview ? (
          <div className="rounded-3xl border border-dashed border-app-border bg-app-surface p-8 text-center text-app-text-muted">
            Publishing data is unavailable right now. Refresh the page or try again after the
            website overview finishes loading.
          </div>
        ) : null}

        {overview ? (
          <>
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
                    className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
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
                      {deployment?.primaryUrl || overview.deployment.primaryUrl}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                      SSL
                    </div>
                    <div className="mt-2 text-sm capitalize text-app-text">
                      {overview.deployment.sslStatus}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={publish}
                    disabled={isSaving || overview.site.blocked}
                    className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Publish latest template
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
