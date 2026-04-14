import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type { PaymentProvider } from '../../../types/payment';
import {
  WebsiteConsoleLayout,
  WebsiteConsoleNotice,
  WebsiteConsoleStatePanel,
  WebsiteConsoleUrlAction,
} from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import {
  deriveWebsiteManagementSnapshot,
  getFormDependencyState,
  getFormSurfaceMeta,
  getWebsiteConsoleUrlTarget,
} from '../lib/websiteConsole';
import {
  clearWebsitesError,
  fetchWebsiteForms,
  fetchWebsiteOverview,
  selectWebsiteForms,
  selectWebsiteIntegrations,
  updateWebsiteForm,
} from '../state';
import type {
  WebsiteFormDefinition,
  WebsiteFormOperationalConfig,
  WebsiteIntegrationStatus,
  WebsiteOverviewSummary,
} from '../types';

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

const WebsiteFormsPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const forms = useAppSelector(selectWebsiteForms);
  const integrations = useAppSelector(selectWebsiteIntegrations);
  const { isSaving, isLoading, error } = useAppSelector((state) => ({
    isSaving: state.websites.isSaving,
    isLoading: state.websites.isLoading,
    error: state.websites.error,
  }));
  const managementSnapshot =
    overview?.managementSnapshot ??
    deriveWebsiteManagementSnapshot(
      overview ? ({ ...overview, forms } as WebsiteOverviewSummary) : overview
    );
  const previewHref = getWebsiteConsoleUrlTarget(overview?.deployment);
  const [drafts, setDrafts] = useState<Record<string, WebsiteFormOperationalConfig>>({});
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

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

  const refreshOverview = () => {
    if (!siteId) return;
    void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
  };

  const integrationStatus = integrations ?? overview?.integrations ?? emptyIntegrationStatus;

  const groupedForms = useMemo(() => {
    const groups = new Map<string, WebsiteFormDefinition[]>();
    forms.forEach((form) => {
      const key = form.pageName;
      groups.set(key, [...(groups.get(key) || []), form]);
    });
    return Array.from(groups.entries());
  }, [forms]);

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
      await dispatch(fetchWebsiteForms(siteId));
      refreshOverview();
      setNotice({ tone: 'success', message: 'Form settings saved.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string' ? result.payload : 'Failed to save form settings.',
      });
    }
  };

  if (!siteId) {
    return null;
  }

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Manage connected public form blocks discovered from the linked template."
      subtitle="Changes here merge over the builder-authored component config and affect public submissions immediately."
      actions={
        <div className="flex flex-wrap gap-3">
          <WebsiteConsoleUrlAction
            href={previewHref}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
            disabledTitle="Preview is unavailable until the site has a public URL."
          >
            Open preview
          </WebsiteConsoleUrlAction>
          <a
            href={`/websites/${siteId}/builder`}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Open builder
          </a>
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

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Connected CTAs
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">{forms.length}</div>
              <p className="mt-2 text-sm text-app-text-muted">
                Every form is wired to a public surface and overrideable here.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Ready CTAs
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
                These CTAs need a newsletter provider or donation provider before they feel
                finished.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Next action
              </div>
              <div className="mt-2 text-lg font-semibold text-app-text">
                {managementSnapshot?.nextAction.title || 'Review a CTA'}
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
            message="We are fetching connected CTAs and their operational overrides."
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
                            Public CTA: {surfaceMeta.label}
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
