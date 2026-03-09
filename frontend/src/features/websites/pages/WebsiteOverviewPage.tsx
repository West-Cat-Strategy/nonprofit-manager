import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { WebsiteConsoleLayout } from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import { fetchWebsiteConversionFunnel } from '../state';

const stepLabels = {
  view: 'View',
  submit: 'Submit',
  confirm: 'Confirm',
} as const;

const formatRate = (current: number, previous: number): string => {
  if (previous <= 0) return '0%';
  return `${Math.round((current / previous) * 100)}%`;
};

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

  const actions = overview ? (
    <>
      <a
        href={overview.deployment.previewUrl || overview.deployment.primaryUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
      >
        Preview
      </a>
      <Link
        to={`/websites/${siteId}/publishing`}
        className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
      >
        Publish Controls
      </Link>
      <Link
        to={`/websites/${siteId}/builder`}
        className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover"
      >
        Open Builder
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
        <div className="rounded-3xl border border-app-border bg-app-surface p-8 text-center text-app-text-muted">
          Loading website overview...
        </div>
      ) : overview ? (
        <div className="space-y-6">
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
                {overview.deployment.domainStatus}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                SSL status: {overview.deployment.sslStatus}
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
