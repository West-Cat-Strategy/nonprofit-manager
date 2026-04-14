import React, { useEffect, useState } from 'react';
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
import { deriveWebsiteManagementSnapshot, getWebsiteConsoleUrlTarget } from '../lib/websiteConsole';
import {
  clearWebsitesError,
  fetchWebsiteIntegrations,
  fetchWebsiteOverview,
  selectWebsiteIntegrations,
  updateWebsiteNewsletterIntegration,
  updateWebsiteStripeIntegration,
} from '../state';

const WebsiteIntegrationsPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const dispatch = useAppDispatch();
  const overview = useWebsiteOverviewLoader(siteId, 30);
  const integrations = useAppSelector(selectWebsiteIntegrations);
  const { isSaving, isLoading, error } = useAppSelector((state) => ({
    isSaving: state.websites.isSaving,
    isLoading: state.websites.isLoading,
    error: state.websites.error,
  }));
  const managementSnapshot =
    overview?.managementSnapshot ?? deriveWebsiteManagementSnapshot(overview);
  const previewHref = getWebsiteConsoleUrlTarget(overview?.deployment);
  const [newsletterProvider, setNewsletterProvider] = useState<'mailchimp' | 'mautic'>('mautic');
  const [donationProvider, setDonationProvider] = useState<PaymentProvider>('stripe');
  const [mailchimpAudienceId, setMailchimpAudienceId] = useState('');
  const [mailchimpTags, setMailchimpTags] = useState('');
  const [mailchimpSyncEnabled, setMailchimpSyncEnabled] = useState(true);
  const [mauticBaseUrl, setMauticBaseUrl] = useState('');
  const [mauticSegmentId, setMauticSegmentId] = useState('');
  const [mauticUsername, setMauticUsername] = useState('');
  const [mauticPassword, setMauticPassword] = useState('');
  const [mauticTags, setMauticTags] = useState('');
  const [mauticSyncEnabled, setMauticSyncEnabled] = useState(true);
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
    setNewsletterProvider(integrations.newsletter.provider || 'mautic');
    setDonationProvider(integrations.stripe.provider || 'stripe');
    setMailchimpAudienceId(integrations.mailchimp.audienceId || '');
    setMailchimpTags((integrations.mailchimp.defaultTags || []).join(', '));
    setMailchimpSyncEnabled(integrations.mailchimp.syncEnabled ?? true);
    setMauticBaseUrl(integrations.mautic.baseUrl || '');
    setMauticSegmentId(integrations.mautic.segmentId || '');
    setMauticUsername(integrations.mautic.username || '');
    setMauticPassword(integrations.mautic.password || '');
    setMauticTags((integrations.mautic.defaultTags || []).join(', '));
    setMauticSyncEnabled(integrations.mautic.syncEnabled ?? true);
    setStripeAccountId(integrations.stripe.accountId || '');
    setStripeCurrency(integrations.stripe.currency || 'usd');
    setStripeSuggestedAmounts((integrations.stripe.suggestedAmounts || [25, 50, 100]).join(','));
    setStripeRecurringDefault(integrations.stripe.recurringDefault ?? false);
    setStripeCampaignId(integrations.stripe.campaignId || '');
  }, [integrations]);

  if (!siteId) {
    return null;
  }

  const saveNewsletter = async () => {
    setNotice(null);
    const result = await dispatch(
      updateWebsiteNewsletterIntegration({
        siteId,
        data:
          newsletterProvider === 'mailchimp'
            ? {
                provider: newsletterProvider,
                mailchimp: {
                  audienceId: mailchimpAudienceId || null,
                  defaultTags: mailchimpTags
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
                  syncEnabled: mailchimpSyncEnabled,
                },
              }
            : {
                provider: newsletterProvider,
                mautic: {
                  baseUrl: mauticBaseUrl || null,
                  segmentId: mauticSegmentId || null,
                  username: mauticUsername || null,
                  password: mauticPassword || null,
                  defaultTags: mauticTags
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean),
                  syncEnabled: mauticSyncEnabled,
                },
              },
      })
    );

    if (updateWebsiteNewsletterIntegration.fulfilled.match(result)) {
      await dispatch(fetchWebsiteIntegrations(siteId));
      void dispatch(fetchWebsiteOverview({ siteId, period: 30 }));
      setNotice({
        tone: 'success',
        message:
          newsletterProvider === 'mailchimp'
            ? 'Mailchimp settings saved.'
            : 'Mautic settings saved.',
      });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string'
            ? result.payload
            : 'Failed to save newsletter settings.',
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
          provider: donationProvider,
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
      setNotice({ tone: 'success', message: 'Donation provider settings saved.' });
    } else {
      setNotice({
        tone: 'error',
        message:
          typeof result.payload === 'string'
            ? result.payload
            : 'Failed to save donation provider settings.',
      });
    }
  };

  return (
    <WebsiteConsoleLayout
      siteId={siteId}
      overview={overview}
      title="Control newsletter provider behavior, donation provider defaults, and integration health."
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
            href="/settings/communications"
            className="rounded-full border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text-muted transition-colors hover:bg-app-surface-muted"
          >
            Open communications hub
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
          <WebsiteConsoleStatePanel
            tone="error"
            title="Website integrations unavailable"
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
                Newsletter
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {integrations?.newsletter.configured ? 'Configured' : 'Missing'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {integrations?.newsletter.provider === 'mautic'
                  ? 'Powers newsletter signup and audience sync through Mautic.'
                  : 'Powers newsletter signup and audience sync through Mailchimp.'}
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                Donation provider
              </div>
              <div className="mt-2 text-3xl font-semibold text-app-text">
                {integrations?.stripe.configured ? 'Configured' : 'Missing'}
              </div>
              <p className="mt-2 text-sm text-app-text-muted">
                {integrations?.stripe.provider === 'paypal'
                  ? 'PayPal powers public donations and recurring support.'
                  : integrations?.stripe.provider === 'square'
                    ? 'Square powers public donations and recurring support.'
                    : 'Stripe powers public donations and recurring support.'}
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
          <WebsiteConsoleStatePanel
            tone="loading"
            title="Loading integration status"
            message="We are fetching newsletter, Stripe, and social tracking configuration."
          />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-app-border bg-app-surface p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-app-text">Newsletter provider</h2>
                <p className="text-sm text-app-text-muted">
                  Choose the audience service connected to newsletter signups.
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-app-text-subtle">
                  New sites prefer Mautic, while existing Mailchimp setups remain editable.
                </p>
              </div>
              <div className="text-sm text-app-text-muted">
                {integrations?.newsletter.configured ? 'Configured' : 'Not configured'}
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <select
                aria-label="Newsletter provider"
                value={newsletterProvider}
                onChange={(event) =>
                  setNewsletterProvider(event.target.value as 'mailchimp' | 'mautic')
                }
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              >
                <option value="mautic">Mautic</option>
                <option value="mailchimp">Mailchimp</option>
              </select>

              {newsletterProvider === 'mailchimp' ? (
                <>
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
                </>
              ) : (
                <>
                  <input
                    type="url"
                    aria-label="Mautic base URL"
                    value={mauticBaseUrl}
                    onChange={(event) => setMauticBaseUrl(event.target.value)}
                    placeholder="https://mautic.example.org"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <input
                    type="text"
                    aria-label="Mautic segment ID"
                    value={mauticSegmentId}
                    onChange={(event) => setMauticSegmentId(event.target.value)}
                    placeholder="Mautic segment ID"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <input
                    type="text"
                    aria-label="Mautic username"
                    value={mauticUsername}
                    onChange={(event) => setMauticUsername(event.target.value)}
                    placeholder="Mautic API username"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <input
                    type="password"
                    aria-label="Mautic password"
                    value={mauticPassword}
                    onChange={(event) => setMauticPassword(event.target.value)}
                    placeholder="Mautic API password"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <input
                    type="text"
                    aria-label="Mautic default tags"
                    value={mauticTags}
                    onChange={(event) => setMauticTags(event.target.value)}
                    placeholder="Default tags (comma separated)"
                    className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
                  />
                  <label className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface-muted px-4 py-3 text-sm text-app-text">
                    <input
                      type="checkbox"
                      checked={mauticSyncEnabled}
                      onChange={(event) => setMauticSyncEnabled(event.target.checked)}
                    />
                    Enable Mautic sync for connected website forms
                  </label>
                </>
              )}

              <button
                type="button"
                disabled={isSaving || Boolean(overview?.site.blocked)}
                onClick={saveNewsletter}
                className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save newsletter settings
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-app-border bg-app-surface p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-app-text">Donation provider</h2>
                <p className="text-sm text-app-text-muted">
                  Configure the provider and donation defaults used by public website donation forms.
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
              <select
                aria-label="Donation provider"
                value={donationProvider}
                onChange={(event) =>
                  setDonationProvider(event.target.value as PaymentProvider)
                }
                className="rounded-2xl border border-app-input-border bg-app-surface px-4 py-3 text-sm"
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
              </select>
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
                className="rounded-full bg-app-accent px-4 py-2 text-sm font-medium text-[var(--app-accent-foreground)] transition-colors hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save donation settings
              </button>
            </div>
          </section>
        </div>
      </div>
    </WebsiteConsoleLayout>
  );
};

export default WebsiteIntegrationsPage;
