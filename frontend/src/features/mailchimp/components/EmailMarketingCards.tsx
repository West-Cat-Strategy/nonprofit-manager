import type { CampaignRun, MailchimpCampaign, MailchimpList } from '../../../types/mailchimp';

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    sent: 'bg-app-accent-soft text-app-accent-text',
    sending: 'bg-app-accent-soft text-app-accent-text',
    schedule: 'bg-app-accent-soft text-app-accent-text',
    scheduled: 'bg-app-accent-soft text-app-accent-text',
    paused: 'bg-app-surface-muted text-app-text',
    save: 'bg-app-surface-muted text-app-text',
    draft: 'bg-app-surface-muted text-app-text',
    canceled: 'bg-app-accent-soft text-app-accent-text',
    failed: 'bg-app-accent-soft text-app-accent-text',
    archived: 'bg-app-surface-muted text-app-text-muted',
  };
  const statusLabels: Record<string, string> = {
    sent: 'Sent',
    sending: 'Sending',
    schedule: 'Scheduled',
    scheduled: 'Scheduled',
    paused: 'Paused',
    save: 'Draft',
    draft: 'Draft',
    canceled: 'Canceled',
    canceling: 'Canceling',
    archived: 'Archived',
    failed: 'Failed',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-app-surface-muted text-app-text'}`}
    >
      {statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function CampaignCard({ campaign }: { campaign: MailchimpCampaign }) {
  const sendTimeLabel = campaign.status === 'schedule' ? 'Scheduled' : 'Sent';

  return (
    <div className="bg-app-surface border border-app-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium text-app-text">{campaign.title}</h4>
          {campaign.subject && (
            <p className="text-sm text-app-text-muted mt-1">{campaign.subject}</p>
          )}
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      {campaign.reportSummary && (
        <div className="mt-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-app-text-heading">{campaign.emailsSent}</p>
            <p className="text-xs text-app-text-muted">Sent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-app-accent">
              {(campaign.reportSummary.openRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-app-text-muted">Open Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-app-accent">
              {(campaign.reportSummary.clickRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-app-text-muted">Click Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-app-text-heading">
              {campaign.reportSummary.unsubscribes}
            </p>
            <p className="text-xs text-app-text-muted">Unsubscribes</p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-app-text-subtle">
        Created: {new Date(campaign.createdAt).toLocaleDateString()}
        {campaign.sendTime &&
          ` | ${sendTimeLabel}: ${new Date(campaign.sendTime).toLocaleDateString()}`}
      </div>
    </div>
  );
}

export function CampaignRunCard({ run }: { run: CampaignRun }) {
  const statusLabels: Record<CampaignRun['status'], string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    sending: 'Sending',
    sent: 'Sent',
    failed: 'Failed',
    canceled: 'Canceled',
  };
  const targetName =
    typeof run.audienceSnapshot.savedAudienceName === 'string'
      ? run.audienceSnapshot.savedAudienceName
      : run.includeAudienceId
        ? 'Saved audience'
        : 'Provider audience';
  const providerCampaignId = run.providerCampaignId || 'Pending provider id';
  const requestedCount =
    typeof run.counts.requestedContactCount === 'number'
      ? run.counts.requestedContactCount
      : undefined;
  const syncedCount =
    typeof run.counts.syncedContactCount === 'number' ? run.counts.syncedContactCount : undefined;
  const providerSegmentName =
    typeof run.audienceSnapshot.providerSegmentName === 'string'
      ? run.audienceSnapshot.providerSegmentName
      : undefined;
  const providerSegmentId =
    typeof run.audienceSnapshot.providerSegmentId === 'number'
      ? run.audienceSnapshot.providerSegmentId
      : undefined;
  const suppressionCount =
    typeof run.counts.suppressionSourceCount === 'number'
      ? run.counts.suppressionSourceCount
      : run.suppressionSnapshot.length;
  const skippedCount =
    typeof run.counts.skippedContactCount === 'number' ? run.counts.skippedContactCount : undefined;
  const targetContactCount =
    typeof run.counts.targetContactCount === 'number'
      ? run.counts.targetContactCount
      : Array.isArray(run.audienceSnapshot.targetContactIds)
        ? run.audienceSnapshot.targetContactIds.length
        : undefined;
  const providerLifecycle =
    typeof run.counts.providerLifecycle === 'object' && run.counts.providerLifecycle !== null
      ? (run.counts.providerLifecycle as Record<string, unknown>)
      : null;

  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-app-text-heading">{run.title}</p>
          <p className="mt-1 text-xs text-app-text-muted">
            Local lifecycle: {statusLabels[run.status]}
          </p>
        </div>
        <StatusBadge status={run.status === 'scheduled' ? 'schedule' : run.status} />
      </div>
      <div className="mt-3 space-y-1 text-xs text-app-text-subtle">
        <p>Provider campaign: {providerCampaignId}</p>
        <p>
          Target: {targetName}
          {run.exclusionAudienceIds.length > 0
            ? ` with ${run.exclusionAudienceIds.length} suppression${run.exclusionAudienceIds.length === 1 ? '' : 's'}`
            : ''}
        </p>
        {providerSegmentId !== undefined || providerSegmentName ? (
          <p>
            Run segment: {providerSegmentName || 'Mailchimp static segment'}
            {providerSegmentId !== undefined ? ` (#${providerSegmentId})` : ''}
          </p>
        ) : null}
        {requestedCount !== undefined || syncedCount !== undefined ? (
          <p>
            Contacts: {syncedCount ?? requestedCount} synced
            {requestedCount !== undefined ? ` from ${requestedCount} requested` : ''}
            {skippedCount !== undefined && skippedCount > 0 ? `, ${skippedCount} skipped` : ''}
          </p>
        ) : null}
        {targetContactCount !== undefined ? (
          <p>
            Target snapshot: {targetContactCount} contact
            {targetContactCount === 1 ? '' : 's'}
          </p>
        ) : null}
        {suppressionCount > 0 ? (
          <p>
            {suppressionCount} contact{suppressionCount === 1 ? '' : 's'} suppressed
          </p>
        ) : null}
        {providerLifecycle ? (
          <p>
            Provider lifecycle:{' '}
            {String(
              providerLifecycle.lastWebhookStatus ||
                providerLifecycle.lastWebhookAction ||
                'received'
            )}
          </p>
        ) : null}
        {run.testRecipients.length > 0 ? (
          <p>
            Test recipients: {run.testRecipients.slice(0, 2).join(', ')}
            {run.testRecipients.length > 2 ? ` +${run.testRecipients.length - 2}` : ''}
          </p>
        ) : null}
        {run.requestedSendTime ? (
          <p>Requested send: {new Date(run.requestedSendTime).toLocaleString()}</p>
        ) : null}
        {run.failureMessage ? (
          <p className="text-app-accent">Failure: {run.failureMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ListCard({
  list,
  isSelected,
  onSelect,
}: {
  list: MailchimpList;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer border rounded-lg p-4 transition-all ${
        isSelected
          ? 'border-app-accent bg-app-accent-soft shadow-md'
          : 'border-app-border bg-app-surface hover:border-app-input-border hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-app-text">{list.name}</h4>
        {isSelected && (
          <svg className="w-5 h-5 text-app-accent" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm text-app-text-muted">
        <span>{list.memberCount.toLocaleString()} subscribers</span>
        {list.doubleOptIn && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-app-accent" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Double Opt-in
          </span>
        )}
      </div>
    </div>
  );
}
