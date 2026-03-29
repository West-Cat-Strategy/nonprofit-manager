import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { WebsiteConsoleLayout, WebsiteConsoleNotice } from '../components';
import useWebsiteOverviewLoader from '../hooks/useWebsiteOverviewLoader';
import { deriveWebsiteManagementSnapshot } from '../lib/websiteConsole';
import {
  clearWebsitesError,
  fetchWebsiteIntegrations,
  fetchWebsiteOverview,
  updateWebsiteMailchimpIntegration,
  updateWebsiteStripeIntegration,
} from '../state';

const WebsiteIntegrationsPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const { integrations, isSaving, isLoading, error } = useAppSelector((state) => state.websites);
  const managementSnapshot = overview?.managementSnapshot ?? deriveWebsiteManagementSnapshot(overview);
  const [mailchimpAudienceId, setMailchimpAudienceId] = useState('');
  const [mailchimpMode, setMailchimpMode] = useState<'crm' | 'mailchimp' | 'both'>('crm');
  const [mailchimpTags, setMailchimpTags] = useState('');
  const [mailchimpSyncEnabled, setMailchimpSyncEnabled] = useState(true);
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeCurrency, setStripeCurrency] = useState('usd');
  const [stripeSuggestedAmounts, setStripeSuggestedAmounts] = useState('25,50,100');
  const [stripeRecurringDefault, setStripeRecurringDefault] = useState(false);
  const [stripeCampaignId, setStripeCampaignId] = useState('');
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!siteId) return;
    void dispatch(fetchWebsiteIntegrations(siteId));
  }, [dispatch, siteId]);

  useEffect(() => {
    if (!integrations) return;
    setMailchimpAudienceId(integrations.mailchimp.audienceId || '');
    setMailchimpMode(integrations.mailchimp.audienceMode || 'crm');
    setMailchimpTags((integrations.mailchimp.defaultTags || []).join(', '));
    setMailchimpSyncEnabled(integrations.mailchimp.syncEnabled ?? true);
    setStripeAccountId(integrations.stripe.accountId || '');
    setStripeCurrency(integrations.stripe.currency || 'usd');
    setStripeSuggestedAmounts((integrations.stripe.suggestedAmounts || [25, 50, 100]).join(','));
    setStripeRecurringDefault(integrations.stripe.recurringDefault ?? false);
    setStripeCampaignId(integrations.stripe.campaignId || '');
  }, [integrations]);

  if (!siteId) {
    return null;
  }

  const saveMailchimp = async () => {
    setNotice(null);
    const result = await dispatch(
      updateWebsiteMailchimpIntegration({
        siteId,
        data: {
          audienceId: mailchimpAudienceId || null,
          audienceMode: mailchimpMode,
          defaultTags: mailchimpTags
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          syncEnabled: mailchimpSyncEnabled,
        },
      })
    );
    if (updateWebsiteMailchimpIntegration.fulfilled.match(result)) {
      await dispatch(fetchWebsiteIntegrations(siteId));
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      setNotice({ tone: 'success', message: 'Mailchimp settings saved.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string'
            ? result.payload
            : 'Failed to save Mailchimp settings.',
      });
    }
  };

  const saveStripe = async () => {
    setNotice(null);
    const result = await dispatch(
      updateWebsiteStripeIntegration({
        siteId,
        data: {
          accountId: stripeAccountId || null,
          currency: stripeCurrency,
          suggestedAmounts: stripeSuggestedAmounts
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isFinite(value) && value > 0),
          recurringDefault: stripeRecurringDefault,
          campaignId: stripeCampaignId || null,
        },
      })
    );
    if (updateWebsiteStripeIntegration.fulfilled.match(result)) {
      await dispatch(fetchWebsiteIntegrations(siteId));
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      setNotice({ tone: 'success', message: 'Stripe settings saved.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string' ? result.payload : 'Failed to save Stripe settings.',
      });
    }
  };

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Control Mailchimp audience behavior, Stripe defaults, and integration health."
      actions={
        <div className="flex flex-wrap gap-3">
          <a
            href={overview?.deployment?.previewUrl || overview?.deployment?.primaryUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Open preview
          </a>
          <a
            href={`/websites/${siteId}/forms`}
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Review forms
          </a>
        </div>
      }
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

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Integration state
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {managementSnapshot?.readiness.integrations ? 'Ready' : 'Needs work'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {managementSnapshot?.nextAction.title || 'Review connected services'}
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Mailchimp
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {integrations?.mailchimp.configured ? 'Configured' : 'Missing'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Powers newsletter signup and audience sync.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Stripe
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {integrations?.stripe.configured ? 'Configured' : 'Missing'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Powers public donations and recurring support.
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Facebook
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {integrations?.social?.facebook?.trackedPageId ? 'Tracked' : 'Not tracked'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                Helps sync social page updates into the site stack.
              </p>
            </div>
          </div>
        </section>

        {isLoading && !integrations ? (
          <div className="rounded-3xl border border-app-border bg-app-surface p-8 text-center text-app-text-muted">
            Loading integration status...
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-app-text">Mailchimp</h2>
              <p className="text-sm text-app-text-muted">
                Configure audience defaults for newsletter and supporter capture.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Powers newsletter signup, email updates, and synced archive imports.
              </p>
            </div>
            <div className="text-sm text-app-text-muted">
              {integrations?.mailchimp.configured ? 'Configured' : 'Not configured'}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <select
              aria-label="Mailchimp audience"
              value={mailchimpAudienceId}
              onChange={(event) => setMailchimpAudienceId(event.target.value)}
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            >
              <option value="">Select audience</option>
              {(integrations?.mailchimp.availableAudiences || []).map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Mailchimp audience mode"
              value={mailchimpMode}
              onChange={(event) =>
                setMailchimpMode(event.target.value as 'crm' | 'mailchimp' | 'both')
              }
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            >
              <option value="crm">CRM only</option>
              <option value="mailchimp">Mailchimp only</option>
              <option value="both">CRM + Mailchimp</option>
            </select>
            <input
              type="text"
              aria-label="Mailchimp default tags"
              value={mailchimpTags}
              onChange={(event) => setMailchimpTags(event.target.value)}
              placeholder="Default tags (comma separated)"
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text">
              <input
                type="checkbox"
                checked={mailchimpSyncEnabled}
                onChange={(event) => setMailchimpSyncEnabled(event.target.checked)}
              />
              Enable Mailchimp sync for connected website forms
            </label>

            <button
              type="button"
              disabled={isSaving || Boolean(overview?.site.blocked)}
              onClick={saveMailchimp}
              className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Mailchimp settings
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-app-border bg-app-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-app-text">Stripe</h2>
              <p className="text-sm text-app-text-muted">
                Configure donation defaults used by public website donation forms.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Powers donation, recurring support, and campaign checkout flows.
              </p>
            </div>
            <div className="text-sm text-app-text-muted">
              {integrations?.stripe.configured ? 'Configured' : 'Not configured'}
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <input
              type="text"
              aria-label="Stripe destination account ID"
              value={stripeAccountId}
              onChange={(event) => setStripeAccountId(event.target.value)}
              placeholder="Destination account ID"
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <input
              type="text"
              aria-label="Stripe currency"
              value={stripeCurrency}
              onChange={(event) => setStripeCurrency(event.target.value)}
              placeholder="Currency"
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <input
              type="text"
              aria-label="Stripe suggested amounts"
              value={stripeSuggestedAmounts}
              onChange={(event) => setStripeSuggestedAmounts(event.target.value)}
              placeholder="Suggested amounts (comma separated)"
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <input
              type="text"
              aria-label="Stripe campaign identifier"
              value={stripeCampaignId}
              onChange={(event) => setStripeCampaignId(event.target.value)}
              placeholder="Campaign identifier"
              className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text">
              <input
                type="checkbox"
                checked={stripeRecurringDefault}
                onChange={(event) => setStripeRecurringDefault(event.target.checked)}
              />
              Default donation forms to recurring mode
            </label>

            <button
              type="button"
              disabled={isSaving || Boolean(overview?.site.blocked)}
              onClick={saveStripe}
              className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Stripe settings
            </button>
          </div>
        </section>
        </div>
      </div>
    </WebsiteConsoleLayout>
  );
};

export default WebsiteIntegrationsPage;
