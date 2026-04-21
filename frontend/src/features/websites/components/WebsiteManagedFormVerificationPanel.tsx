import React from 'react';
import { Link } from 'react-router-dom';
import type { WebsiteManagedFormVerificationSummary } from '../lib/websiteConsole';
import { getWebsiteFormsPath, getWebsitePublishingPath } from '../lib/websiteRouteTargets';
import WebsiteConsoleUrlAction from './WebsiteConsoleUrlAction';

interface WebsiteManagedFormVerificationPanelProps {
  siteId: string;
  summary: WebsiteManagedFormVerificationSummary | null;
  title: string;
  description: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

const actionClasses =
  'rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted';

const buildLaunchClasses = (launchReady: boolean): string =>
  launchReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

const buildPublishClasses = (
  publishState: WebsiteManagedFormVerificationSummary['publishState']
): string => {
  if (publishState === 'live-preview' || publishState === 'live') {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (publishState === 'preview') {
    return 'bg-sky-100 text-sky-800';
  }
  return 'bg-amber-100 text-amber-800';
};

const WebsiteManagedFormVerificationPanel: React.FC<
  WebsiteManagedFormVerificationPanelProps
> = ({ siteId, summary, title, description, emptyTitle, emptyMessage }) => {
  if (!summary) {
    return (
      <section className="rounded-3xl border border-app-border bg-app-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">{title}</div>
            <h2 className="mt-2 text-2xl font-semibold text-app-text">
              {emptyTitle || 'No managed public form found yet'}
            </h2>
            <p className="mt-2 text-sm text-app-text-muted">
              {emptyMessage ||
                'Add a managed form to the template before you verify preview, live publish, and submission behavior.'}
            </p>
          </div>
          <Link to={getWebsiteFormsPath(siteId)} className={actionClasses}>
            Open forms
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">{title}</div>
          <h2 className="mt-2 text-2xl font-semibold text-app-text">{summary.form.title}</h2>
          <p className="mt-2 text-sm leading-6 text-app-text-muted">{description}</p>
          <div className="mt-3 text-sm text-app-text-muted">
            {summary.form.pageName} • {summary.form.path}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-app-surface-muted px-3 py-1 font-medium text-app-text-muted">
              Focus CTA: {summary.surfaceMeta.label}
            </span>
            <span
              className={`rounded-full px-3 py-1 font-medium ${buildLaunchClasses(
                summary.readiness.launchReady
              )}`}
            >
              {summary.launchStateLabel}
            </span>
            <span
              className={`rounded-full px-3 py-1 font-medium ${buildPublishClasses(
                summary.publishState
              )}`}
            >
              {summary.publishStateLabel}
            </span>
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                summary.dependency.ready
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {summary.dependency.ready
                ? `${summary.dependency.label} connected`
                : `${summary.dependency.label} needed`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <WebsiteConsoleUrlAction
            href={summary.previewPageUrl}
            className={actionClasses}
            disabledTitle="Preview page is unavailable until a preview deployment exists."
          >
            Open preview page
          </WebsiteConsoleUrlAction>
          <WebsiteConsoleUrlAction
            href={summary.livePageUrl}
            className={actionClasses}
            disabledTitle="Live page is unavailable until this CTA is published."
          >
            Open live page
          </WebsiteConsoleUrlAction>
          <Link to={getWebsiteFormsPath(siteId)} className={actionClasses}>
            Forms
          </Link>
          <Link to={getWebsitePublishingPath(siteId)} className={actionClasses}>
            Publishing
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
            Launch readiness
          </div>
          <div className="mt-2 text-lg font-semibold text-app-text">{summary.launchStateLabel}</div>
          <p className="mt-2 text-sm text-app-text-muted">{summary.launchStateDetail}</p>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
            Public surface
          </div>
          <div className="mt-2 text-lg font-semibold text-app-text">
            {summary.publishStateLabel}
          </div>
          <p className="mt-2 text-sm text-app-text-muted">{summary.publishStateDetail}</p>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
            Submission endpoint
          </div>
          <div className="mt-2 text-sm font-semibold text-app-text">{summary.submissionMethod}</div>
          <code className="mt-2 block break-all rounded-2xl bg-app-surface px-3 py-2 text-xs text-app-text-muted">
            {summary.submissionEndpoint || 'Managed public submission route unavailable.'}
          </code>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-surface-muted px-4 py-4">
          <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
            Destination dependency
          </div>
          <div className="mt-2 text-lg font-semibold text-app-text">{summary.dependency.label}</div>
          <p className="mt-2 text-sm text-app-text-muted">{summary.dependency.detail}</p>
        </div>
      </div>
    </section>
  );
};

export default WebsiteManagedFormVerificationPanel;
