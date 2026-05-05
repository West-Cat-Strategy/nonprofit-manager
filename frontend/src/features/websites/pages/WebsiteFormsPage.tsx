import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type { PaymentProvider } from '../../../types/payment';
import {
  WebsiteConsoleLayout,
  WebsiteManagedFormVerificationPanel,
  WebsiteConsoleNotice,
  WebsiteConsoleStatePanel,
  WebsiteConsoleUrlAction,
} from '../components';
import PublicActionSubmissionsPanel from '../components/PublicActionSubmissionsPanel';
import { websitesApiClient } from '../api/websitesApiClient';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import {
  deriveWebsiteManagedFormVerification,
  deriveWebsiteManagementSnapshot,
  getFormDependencyState,
  getFormSurfaceMeta,
  getWebsiteConsoleUrlTarget,
} from '../lib/websiteConsole';
import { getWebsiteBuilderPath } from '../lib/websiteRouteTargets';
import {
  clearWebsitesError,
  fetchWebsiteForms,
  selectWebsiteForms,
  selectWebsiteIntegrations,
  updateWebsiteForm,
} from '../state';
import type {
  WebsitePublicAction,
  WebsitePublicActionSubmission,
  WebsitePublicActionSupportLetterArtifact,
  WebsiteFormDefinition,
  WebsiteFormOperationalConfig,
  WebsiteIntegrationStatus,
  WebsiteOverviewSummary,
} from '../types';
import type { PublicActionStatus, PublicActionType } from '../../../types/websiteBuilder';

const emptyIntegrationStatus: WebsiteIntegrationStatus = {
  blocked: false,
  publishStatus: 'draft',
  newsletter: {
    provider: 'mautic',
    configured: false,
    selectedAudienceId: null,
    selectedAudienceName: null,
    selectedPresetId: null,
    listPresets: [],
    availableAudiences: [],
    audienceCount: 0,
    lastRefreshedAt: null,
    lastSyncAt: null,
  },
  mailchimp: {
    configured: false,
    availableAudiences: [],
    lastSyncAt: null,
  },
  mautic: {
    configured: false,
    availableAudiences: [],
    lastSyncAt: null,
  },
  stripe: {
    configured: false,
    publishableKeyConfigured: false,
  },
  social: {
    facebook: {
      lastSyncAt: null,
      lastSyncError: null,
    },
  },
};

const publicActionTypeOptions: Array<{ value: PublicActionType; label: string }> = [
  { value: 'petition_signature', label: 'Petition/add your name' },
  { value: 'donation_pledge', label: 'Donation pledge' },
  { value: 'support_letter_request', label: 'Support letter request' },
  { value: 'event_signup', label: 'Event signup' },
  { value: 'self_referral', label: 'Self-referral' },
  { value: 'donation_checkout', label: 'Donation checkout' },
  { value: 'newsletter_signup', label: 'Newsletter signup' },
  { value: 'volunteer_interest', label: 'Volunteer interest' },
  { value: 'contact', label: 'Contact' },
];

const publicActionStatusOptions: PublicActionStatus[] = [
  'draft',
  'published',
  'closed',
  'archived',
];

const emptyPublicActionDraft = {
  actionType: 'petition_signature' as PublicActionType,
  status: 'draft' as PublicActionStatus,
  title: '',
  slug: '',
  description: '',
};

const WebsiteFormsPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const forms = useAppSelector(selectWebsiteForms);
  const integrations = useAppSelector(selectWebsiteIntegrations);
  const isSaving = useAppSelector((state) => state.websites.isSaving);
  const isLoading = useAppSelector((state) => state.websites.isLoading);
  const error = useAppSelector((state) => state.websites.error);
  const previewHref = getWebsiteConsoleUrlTarget(overview?.deployment);
  const [drafts, setDrafts] = useState<Record<string, WebsiteFormOperationalConfig>>({});
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [publicActions, setPublicActions] = useState<WebsitePublicAction[]>([]);
  const [publicActionSubmissions, setPublicActionSubmissions] = useState<
    WebsitePublicActionSubmission[]
  >([]);
  const [selectedPublicActionId, setSelectedPublicActionId] = useState<string | null>(null);
  const [publicActionDraft, setPublicActionDraft] = useState(emptyPublicActionDraft);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [supportLetterArtifact, setSupportLetterArtifact] =
    useState<WebsitePublicActionSupportLetterArtifact | null>(null);
  const [supportLetterArtifactLoadingId, setSupportLetterArtifactLoadingId] = useState<
    string | null
  >(null);
  const [supportLetterCopyNotice, setSupportLetterCopyNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteForms(siteId));
  }, [dispatch, siteId]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      forms.map((form) => [form.formKey, { ...form.operationalSettings }])
    );
    setDrafts(nextDrafts);
  }, [forms]);

  useEffect(() => {
    if (!siteId) return;
    setIsActionLoading(true);
    websitesApiClient
      .listPublicActions(siteId)
      .then((actions) => {
        setPublicActions(actions);
        setSelectedPublicActionId((current) => current ?? actions[0]?.id ?? null);
      })
      .catch(() => {
        setNotice({
          tone: 'error',
          message: 'Failed to load public actions.',
        });
      })
      .finally(() => setIsActionLoading(false));
  }, [siteId]);

  const integrationStatus = integrations ?? overview?.integrations ?? emptyIntegrationStatus;
  const formsOverview = overview
    ? ({ ...overview, forms, integrations: integrationStatus } as WebsiteOverviewSummary)
    : null;
  const managementSnapshot =
    formsOverview?.managementSnapshot ?? deriveWebsiteManagementSnapshot(formsOverview);
  const managedFormVerification = deriveWebsiteManagedFormVerification(formsOverview);

  const groupedForms = useMemo(() => {
    const groups = new Map<string, WebsiteFormDefinition[]>();
    forms.forEach((form) => {
      const key = form.pageName;
      groups.set(key, [...(groups.get(key) || []), form]);
    });
    return Array.from(groups.entries());
  }, [forms]);

  const selectedPublicAction = useMemo(
    () => publicActions.find((action) => action.id === selectedPublicActionId) ?? null,
    [publicActions, selectedPublicActionId]
  );
  const selfReferralSnapshot = useMemo(() => {
    const selfReferralActions = publicActions.filter(
      (action) => action.actionType === 'self_referral'
    );
    return {
      actions: selfReferralActions.length,
      published: selfReferralActions.filter((action) => action.status === 'published').length,
      reviewableSubmissions: selfReferralActions.reduce(
        (total, action) => total + action.submissionCount,
        0
      ),
    };
  }, [publicActions]);

  useEffect(() => {
    if (!siteId || !selectedPublicActionId) {
      setPublicActionSubmissions([]);
      return;
    }
    setSupportLetterArtifact(null);
    setSupportLetterCopyNotice(null);
    websitesApiClient
      .listPublicActionSubmissions(siteId, selectedPublicActionId)
      .then(setPublicActionSubmissions)
      .catch(() => setPublicActionSubmissions([]));
  }, [selectedPublicActionId, siteId]);

  const updateDraft = (formKey: string, patch: Partial<WebsiteFormOperationalConfig>) => {
    setDrafts((current) => ({
      ...current,
      [formKey]: {
        ...(current[formKey] || {}),
        ...patch,
      },
    }));
  };

  const saveForm = async (formKey: string) => {
    if (!siteId) return;
    setNotice(null);
    const result = await dispatch(
      updateWebsiteForm({
        siteId,
        formKey,
        data: drafts[formKey] || {},
      })
    );
    if (updateWebsiteForm.fulfilled.match(result)) {
      setNotice({ tone: 'success', message: 'Form settings saved.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string' ? result.payload : 'Failed to save form settings.',
      });
    }
  };

  const createPublicAction = async () => {
    if (!siteId || !publicActionDraft.title.trim()) return;
    setIsActionLoading(true);
    setNotice(null);
    try {
      const action = await websitesApiClient.createPublicAction(siteId, {
        actionType: publicActionDraft.actionType,
        status: publicActionDraft.status,
        title: publicActionDraft.title,
        slug: publicActionDraft.slug || undefined,
        description: publicActionDraft.description || undefined,
      });
      setPublicActions((current) => [action, ...current]);
      setSelectedPublicActionId(action.id);
      setPublicActionDraft(emptyPublicActionDraft);
      setNotice({ tone: 'success', message: 'Public action created.' });
    } catch {
      setNotice({ tone: 'error', message: 'Failed to create public action.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const updatePublicActionStatus = async (
    action: WebsitePublicAction,
    status: PublicActionStatus
  ) => {
    if (!siteId) return;
    setIsActionLoading(true);
    setNotice(null);
    try {
      const updated = await websitesApiClient.updatePublicAction(siteId, action.id, { status });
      setPublicActions((current) =>
        current.map((currentAction) => (currentAction.id === updated.id ? updated : currentAction))
      );
      setNotice({ tone: 'success', message: 'Public action status updated.' });
    } catch {
      setNotice({ tone: 'error', message: 'Failed to update public action.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const previewSupportLetterArtifact = async (submissionId: string) => {
    if (!siteId || !selectedPublicActionId) return;
    setSupportLetterCopyNotice(null);
    setSupportLetterArtifactLoadingId(submissionId);
    try {
      const artifact = await websitesApiClient.getPublicActionSupportLetterArtifact(
        siteId,
        selectedPublicActionId,
        submissionId
      );
      setSupportLetterArtifact(artifact);
    } catch {
      setNotice({ tone: 'error', message: 'Failed to load support letter artifact.' });
    } finally {
      setSupportLetterArtifactLoadingId(null);
    }
  };

  const copySupportLetterArtifact = async () => {
    if (!supportLetterArtifact || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(supportLetterArtifact.letterBody);
    setSupportLetterCopyNotice('Letter copied.');
  };

  const downloadSupportLetterArtifact = () => {
    if (!supportLetterArtifact) return;
    const blob = new Blob(
      [`${supportLetterArtifact.letterTitle}\n\n${supportLetterArtifact.letterBody}`],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${
      supportLetterArtifact.letterTitle
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'support-letter'
    }.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!siteId) {
    return null;
  }

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Manage connected public form blocks, launch readiness, and the one-form verification loop."
      subtitle="Changes here merge over the builder-authored component config while keeping preview, live, and submission behavior visible."
      actions={
        <div className="flex flex-wrap gap-3">
          <WebsiteConsoleUrlAction
            href={previewHref}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
            disabledTitle="Preview is unavailable until the site has a public URL."
          >
            Open preview
          </WebsiteConsoleUrlAction>
          <Link
            to={getWebsiteBuilderPath(siteId)}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Open builder
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {error ? (
          <WebsiteConsoleStatePanel
            tone="error"
            title="Website forms unavailable"
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

        <WebsiteManagedFormVerificationPanel
          siteId={siteId}
          summary={managedFormVerification}
          title="Managed form launch verification"
          description="Keep one managed public form easy to verify where you edit it: confirm its launch readiness, open the preview or live page, and follow the submission endpoint before you publish again."
        />

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-app-text">Public actions</h2>
              <p className="max-w-3xl text-sm text-app-text-muted">
                Publish petition, pledge, support-letter, referral, event, donation, newsletter,
                volunteer, and contact actions with reviewable submissions and CSV export.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-app-text-muted">
              <span className="rounded-full bg-app-surface-muted px-3 py-1">
                {publicActions.length} actions
              </span>
              <span className="rounded-full bg-app-surface-muted px-3 py-1">
                {publicActions.filter((action) => action.status === 'published').length} published
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-app-border bg-app-surface-muted p-4">
            <div className="text-xs uppercase tracking-[0.18em]">
              Self-referral status
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-2xl font-semibold">
                  {selfReferralSnapshot.actions}
                </div>
                <div>self-referral actions</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {selfReferralSnapshot.published}
                </div>
                <div>published</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {selfReferralSnapshot.reviewableSubmissions}
                </div>
                <div>reviewable submissions</div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  aria-label="Public action type"
                  value={publicActionDraft.actionType}
                  onChange={(event) =>
                    setPublicActionDraft((current) => ({
                      ...current,
                      actionType: event.target.value as PublicActionType,
                    }))
                  }
                  className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                >
                  {publicActionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Public action status"
                  value={publicActionDraft.status}
                  onChange={(event) =>
                    setPublicActionDraft((current) => ({
                      ...current,
                      status: event.target.value as PublicActionStatus,
                    }))
                  }
                  className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                >
                  {publicActionStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                aria-label="Public action title"
                value={publicActionDraft.title}
                onChange={(event) =>
                  setPublicActionDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Action title"
                className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              />
              <input
                type="text"
                aria-label="Public action slug"
                value={publicActionDraft.slug}
                onChange={(event) =>
                  setPublicActionDraft((current) => ({ ...current, slug: event.target.value }))
                }
                placeholder="Slug (optional, used by action blocks)"
                className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              />
              <textarea
                aria-label="Public action description"
                value={publicActionDraft.description}
                onChange={(event) =>
                  setPublicActionDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Internal readiness notes or public action description"
                rows={3}
                className="w-full rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={createPublicAction}
                disabled={isActionLoading || !publicActionDraft.title.trim()}
                className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Create public action
              </button>
            </div>

            <div className="space-y-4">
              {isActionLoading && publicActions.length === 0 ? (
                <WebsiteConsoleStatePanel
                  tone="loading"
                  title="Loading public actions"
                  message="We are fetching action readiness and submission counts."
                />
              ) : publicActions.length === 0 ? (
                <WebsiteConsoleStatePanel
                  tone="empty"
                  title="No public actions yet"
                  message="Create an action here, then connect its slug to a builder action block."
                />
              ) : (
                <div className="space-y-3">
                  {publicActions.map((action) => (
                    <article
                      key={action.id}
                      className="rounded-2xl border border-app-border bg-app-surface-muted p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedPublicActionId(action.id)}
                          className="text-left"
                        >
                          <div className="font-semibold text-app-text">{action.title}</div>
                          <div className="mt-1 text-sm text-app-text-muted">
                            {action.actionType.replace(/_/g, ' ')} • {action.slug} •{' '}
                            {action.submissionCount} submissions
                          </div>
                          <div className="mt-2 break-all text-xs text-app-text-subtle">
                            /api/v2/public/actions/{siteId}/{action.slug}/submissions
                          </div>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <select
                            aria-label={`Status for ${action.title}`}
                            value={action.status}
                            onChange={(event) =>
                              void updatePublicActionStatus(
                                action,
                                event.target.value as PublicActionStatus
                              )
                            }
                            className="rounded-full border border-app-input-border bg-app-surface px-3 py-1 text-xs"
                          >
                            {publicActionStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <a
                            href={websitesApiClient.getPublicActionSubmissionsExportUrl(
                              siteId,
                              action.id
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-app-border bg-app-surface px-3 py-1 text-xs font-medium text-app-text-muted"
                          >
                            CSV
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {selectedPublicAction ? (
                <PublicActionSubmissionsPanel
                  selectedPublicAction={selectedPublicAction}
                  submissions={publicActionSubmissions}
                  supportLetterArtifact={supportLetterArtifact}
                  supportLetterArtifactLoadingId={supportLetterArtifactLoadingId}
                  supportLetterCopyNotice={supportLetterCopyNotice}
                  onPreviewSupportLetter={(submissionId) =>
                    void previewSupportLetterArtifact(submissionId)
                  }
                  onCopySupportLetter={() => void copySupportLetterArtifact()}
                  onDownloadSupportLetter={downloadSupportLetterArtifact}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Connected forms
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">{forms.length}</div>
              <p className="mt-2 text-sm text-app-text-muted">
                Every form is connected to a public page and can be adjusted here.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Ready forms
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {
                  forms.filter((form) => getFormDependencyState(form, integrationStatus).ready)
                    .length
                }
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Forms whose required integration is already configured.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Missing dependencies
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {
                  forms.filter((form) => !getFormDependencyState(form, integrationStatus).ready)
                    .length
                }
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                These forms need a newsletter provider or donation provider before they feel
                finished.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Next action
              </div>
              <div className="mt-2 text-lg font-semibold text-app-text">
                {managementSnapshot?.nextAction.title || 'Review a form'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {managementSnapshot?.nextAction.detail ||
                  'Check the public surface, integration dependency, and override status.'}
              </p>
            </div>
          </div>
        </section>

        {isLoading && forms.length === 0 ? (
          <WebsiteConsoleStatePanel
            tone="loading"
            title="Loading website forms"
            message="We are fetching connected forms and their operational overrides."
          />
        ) : null}

        {!isLoading && groupedForms.length === 0 ? (
          <WebsiteConsoleStatePanel
            tone="empty"
            title="No connected website forms"
            message="The linked template has no public form blocks yet."
          />
        ) : null}

        {groupedForms.map(([pageName, pageForms]) => (
          <section
            key={pageName}
            className="rounded-3xl border border-app-border bg-app-surface p-5"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-app-text">{pageName}</h2>
              <p className="text-sm text-app-text-muted">
                {pageForms.length} connected surface{pageForms.length === 1 ? '' : 's'} on this page
              </p>
            </div>

            <div className="space-y-4">
              {pageForms.map((form) => {
                const draft = drafts[form.formKey] || {};
                const tagsValue = (draft.defaultTags || []).join(', ');
                const surfaceMeta = getFormSurfaceMeta(form.formType);
                const dependencyState = getFormDependencyState(form, integrationStatus);

                return (
                  <article
                    key={form.formKey}
                    className="rounded-2xl border border-app-border bg-app-surface-muted p-4"
                  >
                    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-app-text">{form.title}</div>
                        <div className="mt-1 text-sm text-app-text-muted">
                          {surfaceMeta.label} • {form.path}
                        </div>
                        <p className="mt-2 max-w-2xl text-sm text-app-text-muted">
                          {surfaceMeta.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-app-surface px-3 py-1 font-medium text-app-text-muted">
                            Public form: {surfaceMeta.label}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 font-medium ${
                              dependencyState.ready
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Depends on: {dependencyState.label}
                          </span>
                          <span className="rounded-full bg-app-surface px-3 py-1 font-medium text-app-text-muted">
                            {form.blocked ? 'Read-only' : 'Editable override'}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-app-text-subtle">
                          {dependencyState.detail}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSaving || Boolean(form.blocked)}
                        onClick={() => saveForm(form.formKey)}
                        className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save form settings
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        value={draft.heading || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { heading: event.target.value })
                        }
                        placeholder="Heading override"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.successMessage || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { successMessage: event.target.value })
                        }
                        placeholder="Success message"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.submitText || draft.buttonText || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, {
                            submitText: event.target.value,
                            buttonText: event.target.value,
                          })
                        }
                        placeholder="Primary button text"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={draft.accountId || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { accountId: event.target.value || null })
                        }
                        placeholder="Destination account ID"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                      />
                      <input
                        type="text"
                        value={tagsValue}
                        onChange={(event) =>
                          updateDraft(form.formKey, {
                            defaultTags: event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Default tags (comma separated)"
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm md:col-span-2"
                      />
                      <textarea
                        value={draft.description || ''}
                        onChange={(event) =>
                          updateDraft(form.formKey, { description: event.target.value })
                        }
                        placeholder="Operational description or helper copy"
                        rows={3}
                        className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm md:col-span-2"
                      />
                    </div>

                    {form.formType === 'newsletter-signup' ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input
                          type="text"
                          value={
                            integrationStatus.newsletter.provider === 'mautic'
                              ? draft.mauticSegmentId || ''
                              : draft.mailchimpListId || ''
                          }
                          onChange={(event) =>
                            updateDraft(form.formKey, {
                              ...(integrationStatus.newsletter.provider === 'mautic'
                                ? { mauticSegmentId: event.target.value || null }
                                : { mailchimpListId: event.target.value || null }),
                            })
                          }
                          placeholder={
                            integrationStatus.newsletter.provider === 'mautic'
                              ? 'Mautic segment ID'
                              : 'Mailchimp audience ID'
                          }
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        />
                        <select
                          value={draft.audienceMode || 'crm'}
                          onChange={(event) =>
                            updateDraft(form.formKey, {
                              audienceMode: event.target.value as
                                | 'crm'
                                | 'mailchimp'
                                | 'mautic'
                                | 'both',
                            })
                          }
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        >
                          <option value="crm">CRM only</option>
                          <option value="mautic">Mautic only</option>
                          <option value="mailchimp">Mailchimp only</option>
                          <option value="both">CRM + newsletter provider</option>
                        </select>
                      </div>
                    ) : null}

                    {form.formType === 'donation-form' ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <input
                          type="text"
                          value={draft.currency || ''}
                          onChange={(event) =>
                            updateDraft(form.formKey, { currency: event.target.value })
                          }
                          placeholder="Currency (CAD, USD)"
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        />
                        <select
                          aria-label="Donation provider"
                          value={draft.provider || integrationStatus.stripe.provider || 'stripe'}
                          onChange={(event) =>
                            updateDraft(form.formKey, {
                              provider: event.target.value as PaymentProvider,
                            })
                          }
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        >
                          <option value="stripe">Stripe</option>
                          <option value="paypal">PayPal</option>
                          <option value="square">Square</option>
                        </select>
                        <input
                          type="text"
                          value={draft.campaignId || ''}
                          onChange={(event) =>
                            updateDraft(form.formKey, { campaignId: event.target.value || null })
                          }
                          placeholder="Campaign identifier"
                          className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                        />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </WebsiteConsoleLayout>
  );
};

export default WebsiteFormsPage;
