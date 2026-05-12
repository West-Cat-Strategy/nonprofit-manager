import type { CommunicationProvider, CommunicationProviderStatus } from '../../../types/mailchimp';

interface EmailMarketingProviderControlsProps {
  selectedProvider: CommunicationProvider;
  onSelectProvider: (provider: CommunicationProvider) => void;
  isLocalSmtpReady: boolean;
  isMauticConfigured: boolean;
  isMailchimpConfigured: boolean;
  localDeliveryReadinessMessage: string;
  mauticProviderStatus?: CommunicationProviderStatus;
  mailchimpProviderStatus?: CommunicationProviderStatus;
  legacyMailchimpAccountName?: string;
}

const providerButtonClass = (isActive: boolean): string =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-app-accent text-[var(--app-accent-foreground)]'
      : 'border border-app-input-border text-app-text-muted'
  }`;

export function EmailMarketingProviderControls({
  selectedProvider,
  onSelectProvider,
  isLocalSmtpReady,
  isMauticConfigured,
  isMailchimpConfigured,
  localDeliveryReadinessMessage,
  mauticProviderStatus,
  mailchimpProviderStatus,
  legacyMailchimpAccountName,
}: EmailMarketingProviderControlsProps) {
  const mailchimpAccountName = mailchimpProviderStatus?.accountName || legacyMailchimpAccountName;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-app-border bg-app-surface p-4">
          <p className="text-sm font-medium text-app-text-heading">Local Email</p>
          <p className="mt-1 text-sm text-app-text-muted">
            {isLocalSmtpReady
              ? localDeliveryReadinessMessage
              : `CRM audience building is available. ${localDeliveryReadinessMessage}`}
          </p>
        </div>
        {isMauticConfigured ? (
          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <p className="text-sm font-medium text-app-text-heading">Mautic</p>
            <p className="mt-1 text-sm text-app-text-muted">
              Preferred open-source external sync provider
              {mauticProviderStatus?.audienceCount !== undefined
                ? ` with ${mauticProviderStatus.audienceCount.toLocaleString()} segment${mauticProviderStatus.audienceCount === 1 ? '' : 's'}`
                : ''}
              .
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-app-input-border bg-app-surface p-4">
            <p className="text-sm font-medium text-app-text-heading">Mautic Preferred</p>
            <p className="mt-1 text-sm text-app-text-muted">
              Configure Mautic to enable open-source external audience sync; local email remains primary.
            </p>
          </div>
        )}
        {isMailchimpConfigured ? (
          <div className="rounded-lg border border-app-border bg-app-surface p-4">
            <p className="text-sm font-medium text-app-text-heading">Mailchimp</p>
            <p className="mt-1 text-sm text-app-text-muted">
              Optional provider connected{mailchimpAccountName ? `: ${mailchimpAccountName}` : ''}.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-app-input-border bg-app-surface p-4">
            <p className="text-sm font-medium text-app-text-heading">Mailchimp Optional</p>
            <p className="mt-1 text-sm text-app-text-muted">
              Mailchimp is not configured, so the workspace stays on local email and CRM audiences.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-app-border bg-app-surface p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={selectedProvider === 'local_email'}
            onClick={() => onSelectProvider('local_email')}
            className={providerButtonClass(selectedProvider === 'local_email')}
          >
            Local Email
          </button>
          {isMauticConfigured ? (
            <button
              type="button"
              aria-pressed={selectedProvider === 'mautic'}
              onClick={() => onSelectProvider('mautic')}
              className={providerButtonClass(selectedProvider === 'mautic')}
            >
              Mautic
            </button>
          ) : null}
          {isMailchimpConfigured ? (
            <button
              type="button"
              aria-pressed={selectedProvider === 'mailchimp'}
              onClick={() => onSelectProvider('mailchimp')}
              className={providerButtonClass(selectedProvider === 'mailchimp')}
            >
              Mailchimp
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
