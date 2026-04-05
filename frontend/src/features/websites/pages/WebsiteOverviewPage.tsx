import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { WebsiteConsoleLayout, WebsiteConsoleStatePanel, WebsiteConsoleUrlAction } from '../components';
import {
  deriveWebsiteManagementSnapshot,
  formatWebsiteConsoleDate,
  getWebsiteConsoleUrlTarget,
} from '../lib/websiteConsole';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import { fetchWebsiteConversionFunnel, fetchWebsiteOverview } from '../state';

const stepLabels = {
  view: 'View',
  submit: 'Submit',
  confirm: 'Confirm',
} as const;

const formatRate = (current: number, previous: number): string => {
  if (previous <= 0) return '0%';
  return `${Math.round((current / previous) * 100)}%`;
};

const getWebsiteActionToneClasses = (tone?: string) =>
  tone === 'warning'
    ? 'bg-amber-600 text-white hover:bg-amber-700'
    : tone === 'primary'
      ? 'bg-app-accent text-[var(--app-accent-foreground)] hover:bg-app-accent-hover'
      : 'bg-slate-700 text-white hover:bg-slate-800';

const WebsiteOverviewPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const { isLoading, funnel, funnelLoading, funnelError } = useAppSelector((state) => state.websites);
  const overview = useWebsiteOverviewLoader(siteId, 30);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteConversionFunnel({ siteId, windowDays: 30 }));
  }, [dispatch, siteId]);

  const funnelForSite = siteId && funnel?.siteId === siteId ? funnel : null;
  const stepMap = new Map((funnelForSite?.steps || []).map((step) => [step.step, step]));
  const funnelSteps = {
    view: stepMap.get('view') || { step: 'view' as const, count: 0, uniqueVisitors: 0 },
    submit: stepMap.get('submit') || { step: 'submit' as const, count: 0, uniqueVisitors: 0 },
    confirm: stepMap.get('confirm') || { step: 'confirm' as const, count: 0, uniqueVisitors: 0 },
  };

  if (!siteId) {
    return null;
  }

  const managementSnapshot = overview?.managementSnapshot ?? deriveWebsiteManagementSnapshot(overview);
  const previewHref = getWebsiteConsoleUrlTarget(overview?.deployment);

  const actions = overview ? (
    <>
      <WebsiteConsoleUrlAction
        href={previewHref}
        className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
        disabledTitle="Preview is unavailable until the site has a public URL."
      >
        Open preview
      </WebsiteConsoleUrlAction>
      <Link
        to={`/websites/${siteId}/content`}
        className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
      >
        Content
      </Link>
      <Link
        to={`/websites/${siteId}/forms`}
        className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
      >
        Forms
      </Link>
      <Link
        to={`/websites/${siteId}/publishing`}
        className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
      >
        Publishing
      </Link>
      <Link
        to={`/websites/${siteId}/builder`}
        className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] shadow-sm transition-colors hover:bg-app-accent-hover"
      >
        Open builder
      </Link>
    </>
  ) : null;

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Monitor site health, conversions, routes, and linked nonprofit-manager behavior."
      subtitle="Live events and newsletters continue to render at request time without a republish."
      actions={actions}
    >
      {isLoading && !overview ? (
        <WebsiteConsoleStatePanel
          tone="loading"
          title="Loading website overview"
          message="We are fetching the site summary, live routes, form connections, and conversion data."
        />
      ) : !overview ? (
        <WebsiteConsoleStatePanel
          tone="empty"
          title="Website overview unavailable"
          message="Refresh the page or return to the website list to load the latest site summary."
          action={
            <button
              type="button"
              onClick={() => {
                void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
              }}
              className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover"
            >
              Retry overview
            </button>
          }
        />
      ) : overview ? (
        <div className="space-y-6">
          <section className="rounded-3xl border border-app-border bg-gradient-to-br from-app-surface to-app-surface-muted p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] xl:items-start">
              <div className="max-w-2xl">
                <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                  Recommended next step
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-app-text sm:text-3xl">
                  {managementSnapshot?.nextAction.title || 'Open the public preview'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-app-text-muted">
                  {managementSnapshot?.nextAction.detail ||
                    'Review the live pages, recent updates, and conversion flow before sharing the site.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {managementSnapshot?.nextAction.href?.startsWith('http') ? (
                    <a
                      href={managementSnapshot.nextAction.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${getWebsiteActionToneClasses(
                        managementSnapshot.nextAction.tone
                      )}`}
                    >
                      {managementSnapshot?.nextAction.title || 'Open preview'}
                    </a>
                  ) : (
                    <Link
                      to={managementSnapshot?.nextAction.href || `/websites/${siteId}/publishing`}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${getWebsiteActionToneClasses(
                        managementSnapshot?.nextAction.tone
                      )}`}
                    >
                      {managementSnapshot?.nextAction.title || 'Open preview'}
                    </Link>
                  )}
                  <Link
                    to={`/websites/${siteId}/publishing`}
                    className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                  >
                    Publishing
                  </Link>
                  <Link
                    to={`/websites/${siteId}/builder`}
                    className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
                  >
                    Builder
                  </Link>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Console state
                  </div>
                  <div className="mt-2 text-lg font-semibold capitalize text-app-text">
                    {managementSnapshot?.status || 'attention'}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {overview.site.status} • version {overview.site.publishedVersion || 'draft'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Freshness
                  </div>
                  <div className="mt-2 text-lg font-semibold text-app-text">
                    {formatWebsiteConsoleDate(managementSnapshot?.lastUpdatedAt || overview.site.updatedAt)}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Published {formatWebsiteConsoleDate(managementSnapshot?.lastPublishedAt || overview.site.publishedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Publish readiness
                  </div>
                  <div className="mt-2 text-lg font-semibold text-app-text">
                    {managementSnapshot?.readiness.publish ? 'Ready' : 'Needs work'}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    Domain {managementSnapshot?.readiness.domain ? 'ready' : 'missing'} • Forms{' '}
                    {managementSnapshot?.readiness.forms ? 'connected' : 'missing'}
                  </p>
                </div>
                <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                    Live surface count
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-app-text">
                    {managementSnapshot?.signals.liveRoutes || overview.liveRoutes.length}
                  </div>
                  <p className="mt-1 text-sm text-app-text-muted">
                    {managementSnapshot?.signals.forms || overview.forms.length} forms •{' '}
                    {managementSnapshot?.signals.conversions || overview.conversionMetrics.totalConversions}{' '}
                    conversions
                  </p>
                </div>
              </div>
            </div>

            {managementSnapshot?.attentionItems.length ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {managementSnapshot.attentionItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-app-text">{item.title}</div>
                        <p className="mt-1 text-sm text-app-text-muted">{item.detail}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : item.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="mt-3 inline-flex text-sm font-medium text-app-accent"
                      >
                        {item.actionLabel || 'Open'}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Total conversions
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {overview.conversionMetrics.totalConversions}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {overview.conversionMetrics.formSubmissions} form submissions,{' '}
                {overview.conversionMetrics.eventRegistrations} event registrations,{' '}
                {overview.conversionMetrics.donations} donations.
              </p>
            </div>
            <div className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Publishing
              </div>
              <div className="mt-2 text-lg font-semibold capitalize text-app-text">
                {overview.site.status}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Version {overview.site.publishedVersion || 'not published yet'}
              </p>
            </div>
            <div className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Domain / SSL
              </div>
              <div className="mt-2 text-lg font-semibold text-app-text">
                {overview?.deployment?.domainStatus || 'configured'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                SSL status: {overview?.deployment?.sslStatus || 'unconfigured'}
              </p>
            </div>
            <div className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Active surfaces
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {overview.forms.length + overview.liveRoutes.length}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {overview.forms.length} connected forms • {overview.liveRoutes.length} live routes
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-app-text">Live routes</h2>
                  <p className="text-sm text-app-text-muted">
                    These pages are currently published on the live site.
                  </p>
                </div>
                <Link
                  to={`/websites/${siteId}/publishing`}
                  className="text-sm font-medium text-app-accent"
                >
                  Manage publishing
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {overview.liveRoutes.map((route) => (
                  <div
                    key={`${route.pageId}-${route.path}`}
                    className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-app-text">{route.pageName}</div>
                        <div className="text-sm text-app-text-muted">{route.path}</div>
                      </div>
                      <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                        {route.pageType}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div>
                <h2 className="text-lg font-semibold text-app-text">Recent conversions</h2>
                <p className="text-sm text-app-text-muted">
                  First-class analytics events from public forms, donations, and event registrations.
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {overview.conversionMetrics.recentConversions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-app-border px-4 py-5 text-sm text-app-text-muted">
                    No recent conversion events yet.
                  </div>
                ) : (
                  overview.conversionMetrics.recentConversions.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium capitalize text-app-text">
                            {event.eventType.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-app-text-muted">{event.pagePath}</div>
                        </div>
                        <div className="text-xs text-app-text-subtle">
                          {new Date(event.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-app-text">Conversion funnel</h2>
                  <p className="text-sm text-app-text-muted">
                    Step-based conversion telemetry from append-only website events over the last 30 days.
                  </p>
                </div>
                {funnelLoading && !funnelForSite ? (
                  <div className="text-sm text-app-text-muted">Loading funnel...</div>
                ) : null}
              </div>

              {funnelError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {funnelError}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {(['view', 'submit', 'confirm'] as const).map((step, index, steps) => {
                  const currentStep = funnelSteps[step];
                  const previousStepKey = index > 0 ? steps[index - 1] : null;
                  const previousStep = previousStepKey ? funnelSteps[previousStepKey] : null;
                  const dropOff = previousStep ? Math.max(previousStep.count - currentStep.count, 0) : 0;

                  return (
                    <div
                      key={step}
                      className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4"
                    >
                      <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                        {stepLabels[step]}
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-app-text">
                        {currentStep.count}
                      </div>
                      <p className="mt-1 text-sm text-app-text-muted">
                        {currentStep.uniqueVisitors} unique visitors
                      </p>
                      {previousStep ? (
                        <div className="mt-3 text-xs text-app-text-muted">
                          {stepLabels[previousStep.step]} to {stepLabels[step]}: {formatRate(currentStep.count, previousStep.count)}
                          {' • '}
                          Drop-off: {dropOff}
                        </div>
                      ) : (
                        <div className="mt-3 text-xs text-app-text-muted">
                          Starting point for funnel conversion tracking.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-app-border bg-app-surface p-5">
              <div>
                <h2 className="text-lg font-semibold text-app-text">Recent funnel events</h2>
                <p className="text-sm text-app-text-muted">
                  Latest view, submit, and confirm events recorded for this site.
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {!funnelForSite || funnelForSite.recentEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-app-border px-4 py-5 text-sm text-app-text-muted">
                    No funnel events recorded yet.
                  </div>
                ) : (
                  funnelForSite.recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-medium capitalize text-app-text">
                            {stepLabels[event.step]} • {event.conversionType.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-app-text-muted">{event.pagePath}</div>
                        </div>
                        <div className="text-xs text-app-text-subtle">
                          {new Date(event.occurredAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </WebsiteConsoleLayout>
  );
};

export default WebsiteOverviewPage;
