import { useEffect, useId, useMemo, useRef, useState } from 'react';
import EmailCampaignBuilder from '../../builder/components/EmailCampaignBuilder';
import { createDefaultEmailBuilderContent } from '../../builder/components/emailCampaignBuilderDefaults';
import CampaignPreviewModal from './CampaignPreviewModal';
import type {
  MailchimpCampaign,
  MailchimpList,
  MailchimpSegment,
  SavedAudience,
  CampaignRun,
  CreateCampaignRequest,
  MailchimpCampaignPreview,
} from '../../../types/mailchimp';

export function StatusBadge({ status }: { status: string }) {
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
        {campaign.sendTime && ` | ${sendTimeLabel}: ${new Date(campaign.sendTime).toLocaleDateString()}`}
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
        {suppressionCount > 0 ? (
          <p>{suppressionCount} contact{suppressionCount === 1 ? '' : 's'} suppressed</p>
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
        {run.failureMessage ? <p className="text-app-accent">Failure: {run.failureMessage}</p> : null}
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

export function SyncResultModal({
  result,
  onClose,
}: {
  result: { total: number; added: number; updated: number; skipped: number; errors: number };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 app-popup-backdrop flex items-center justify-center z-50">
      <div className="bg-app-surface rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-app-text-heading">Sync Complete</h3>
          <button onClick={onClose} className="text-app-text-subtle hover:text-app-text-muted">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-app-surface-muted rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-app-text-heading">{result.total}</p>
            <p className="text-sm text-app-text-muted">Total Processed</p>
          </div>
          <div className="bg-app-accent-soft rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-app-accent">{result.added}</p>
            <p className="text-sm text-app-text-muted">Added</p>
          </div>
          <div className="bg-app-accent-soft rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-app-accent">{result.updated}</p>
            <p className="text-sm text-app-text-muted">Updated</p>
          </div>
          <div className="bg-app-accent-soft rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-app-accent">{result.skipped}</p>
            <p className="text-sm text-app-text-muted">Skipped</p>
          </div>
        </div>

        {result.errors > 0 && (
          <div className="mt-4 bg-app-accent-soft rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-app-accent">{result.errors}</p>
            <p className="text-sm text-app-text-muted">Errors</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full bg-app-accent text-[var(--app-accent-foreground)] py-2 px-4 rounded-lg hover:bg-app-accent-hover transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function CampaignCreateModal({
  lists,
  segments,
  savedAudiences,
  isCreatingCampaign,
  isSendingCampaign,
  onClose,
  onListChange,
  onPreview,
  onSubmit,
}: {
  lists: MailchimpList[];
  segments: MailchimpSegment[];
  savedAudiences: SavedAudience[];
  isCreatingCampaign: boolean;
  isSendingCampaign: boolean;
  onClose: () => void;
  onListChange: (listId: string) => void;
  onPreview: (data: CreateCampaignRequest) => Promise<MailchimpCampaignPreview>;
  onSubmit: (data: CreateCampaignRequest, sendNow: boolean) => Promise<void> | void;
}) {
  type TargetingMode = 'all' | 'provider_segment' | 'saved_audience';
  type SubmitIntent = 'draft_or_schedule' | 'send_now';
  const dialogTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const previewResultRef = useRef<MailchimpCampaignPreview | null>(null);
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    listId: lists[0]?.id || '',
    title: '',
    subject: '',
    previewText: '',
    fromName: '',
    replyTo: '',
    htmlContent: '',
    plainTextContent: '',
    builderContent: createDefaultEmailBuilderContent(),
    segmentId: undefined,
    sendTime: undefined,
    includeAudienceId: undefined,
    exclusionAudienceIds: [],
    suppressionSnapshot: [],
    testRecipients: [],
    audienceSnapshot: {},
  });
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('all');
  const [compositionMode, setCompositionMode] = useState<'builder' | 'html'>('builder');
  const [previewResult, setPreviewResult] = useState<MailchimpCampaignPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isCampaignSubmitPending = isCreatingCampaign || isSendingCampaign;
  const isCampaignActionPending = isPreviewing || isCampaignSubmitPending;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previewResultRef.current = previewResult;
  }, [previewResult]);

  useEffect(() => {
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !previewResultRef.current) {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    if (!isCampaignSubmitPending) {
      setSubmitIntent(null);
    }
  }, [isCampaignSubmitPending]);

  useEffect(() => {
    if (!formData.listId && lists[0]?.id) {
      setFormData((prev) => ({ ...prev, listId: lists[0].id }));
      onListChange(lists[0].id);
    }
  }, [formData.listId, lists, onListChange]);

  const savedAudiencesForList = useMemo(
    () =>
      savedAudiences.filter(
        (audience) =>
          audience.status === 'active' &&
          typeof audience.filters.listId === 'string' &&
          audience.filters.listId === formData.listId
      ),
    [formData.listId, savedAudiences]
  );

  const selectedIncludeAudience = savedAudiencesForList.find(
    (audience) => audience.id === formData.includeAudienceId
  );

  const hasBuilderContent = (data: CreateCampaignRequest): boolean =>
    Boolean(
      data.builderContent?.blocks.some((block) => {
        switch (block.type) {
          case 'heading':
          case 'paragraph':
            return Boolean(block.content.trim());
          case 'button':
            return Boolean(block.label.trim() && block.url.trim());
          case 'image':
            return Boolean(block.src.trim());
          case 'divider':
            return true;
        }
      })
    );

  const buildRequest = (shouldSendNow: boolean): CreateCampaignRequest => {
    const sendTime = shouldSendNow ? undefined : formData.sendTime;
    const testRecipients = (formData.testRecipients || [])
      .map((recipient) => recipient.trim())
      .filter(Boolean);
    const audienceSnapshot = {
      ...(formData.audienceSnapshot || {}),
      listId: formData.listId,
      targetingMode:
        targetingMode === 'saved_audience'
          ? 'saved_audience'
          : targetingMode === 'provider_segment'
            ? 'provider_segment'
            : 'all_subscribers',
      testRecipientCount: testRecipients.length,
    };

    if (compositionMode === 'builder') {
      return {
        ...formData,
        htmlContent: undefined,
        plainTextContent: undefined,
        builderContent: formData.builderContent,
        sendTime,
        testRecipients,
        audienceSnapshot,
      };
    }

    return {
      ...formData,
      builderContent: undefined,
      htmlContent: formData.htmlContent?.trim() || undefined,
      plainTextContent: formData.plainTextContent?.trim() || undefined,
      sendTime,
      testRecipients,
      audienceSnapshot,
    };
  };

  const validateForm = (shouldSendNow: boolean): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.listId) newErrors.listId = 'Please select an audience';
    if (!formData.title.trim()) newErrors.title = 'Campaign title is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject line is required';
    if (!formData.fromName.trim()) newErrors.fromName = 'From name is required';
    if (!formData.replyTo.trim()) {
      newErrors.replyTo = 'Reply-to email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.replyTo)) {
      newErrors.replyTo = 'Invalid email address';
    }

    if (compositionMode === 'builder') {
      if (!hasBuilderContent(formData)) {
        newErrors.content = 'Add at least one meaningful builder block before sending or previewing.';
      }
    } else if (!formData.htmlContent?.trim() && !formData.plainTextContent?.trim()) {
      newErrors.content = 'Add HTML or plain text content before sending or previewing.';
    }

    if (!shouldSendNow && formData.sendTime) {
      const sendDate = new Date(formData.sendTime);
      if (sendDate <= new Date()) {
        newErrors.sendTime = 'Send time must be in the future';
      }
    }

    if (targetingMode === 'provider_segment' && !formData.segmentId) {
      newErrors.targeting = 'Choose a provider segment or use all subscribers.';
    }

    if (targetingMode === 'saved_audience' && !formData.includeAudienceId) {
      newErrors.targeting = 'Choose a saved audience for campaign delivery.';
    }

    if (
      targetingMode === 'saved_audience' &&
      formData.includeAudienceId &&
      formData.exclusionAudienceIds?.includes(formData.includeAudienceId)
    ) {
      newErrors.targeting = 'A saved audience cannot suppress itself.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent, shouldSendNow: boolean) => {
    e.preventDefault();
    if (!isCampaignActionPending && validateForm(shouldSendNow)) {
      setSubmitIntent(shouldSendNow ? 'send_now' : 'draft_or_schedule');
      onSubmit(buildRequest(shouldSendNow), shouldSendNow);
    }
  };

  const handlePreview = async () => {
    if (isCampaignActionPending) {
      return;
    }

    if (!validateForm(false)) {
      return;
    }

    try {
      setIsPreviewing(true);
      const preview = await onPreview(buildRequest(false));
      setErrors((prev) => ({ ...prev, content: '' }));
      setPreviewResult(preview);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        content: typeof error === 'string' ? error : 'Failed to render preview.',
      }));
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 app-popup-backdrop flex items-center justify-center z-50 overflow-y-auto">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          className="bg-app-surface rounded-lg shadow-xl max-w-5xl w-full mx-4 my-8"
        >
        <div className="flex justify-between items-center p-6 border-b border-app-border">
          <h3 id={dialogTitleId} className="text-xl font-medium text-app-text">
            Create Email Campaign
          </h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close campaign creation dialog"
            className="text-app-text-subtle hover:text-app-text-muted"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

          <form className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Audience <span className="text-app-accent">*</span>
            </label>
            <select
              aria-label="Audience"
              value={formData.listId}
              onChange={(e) => {
                const nextListId = e.target.value;
                setTargetingMode('all');
                setFormData((prev) => ({
                  ...prev,
                  listId: nextListId,
                  segmentId: undefined,
                  includeAudienceId: undefined,
                  exclusionAudienceIds: [],
                  suppressionSnapshot: [],
                  audienceSnapshot: {},
                }));
                onListChange(nextListId);
              }}
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.memberCount.toLocaleString()} subscribers)
                </option>
              ))}
            </select>
            {errors.listId && <p className="mt-1 text-sm text-app-accent">{errors.listId}</p>}
          </div>

          <div className="rounded-lg border border-app-border p-4">
            <label className="block text-sm font-medium text-app-text-label mb-2">
              Targeting
            </label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                ['all', 'All subscribers'],
                ['provider_segment', 'Provider segment'],
                ['saved_audience', 'Saved audience'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={targetingMode === mode}
                  onClick={() => {
                    const nextMode = mode as TargetingMode;
                    setTargetingMode(nextMode);
                    setFormData((prev) => ({
                      ...prev,
                      segmentId: nextMode === 'provider_segment' ? prev.segmentId : undefined,
                      includeAudienceId:
                        nextMode === 'saved_audience' ? prev.includeAudienceId : undefined,
                      exclusionAudienceIds:
                        nextMode === 'saved_audience' ? prev.exclusionAudienceIds : [],
                      suppressionSnapshot:
                        nextMode === 'saved_audience' ? prev.suppressionSnapshot : [],
                      audienceSnapshot: nextMode === 'saved_audience' ? prev.audienceSnapshot : {},
                    }));
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    targetingMode === mode
                      ? 'border-app-accent bg-app-accent-soft text-app-accent-text'
                      : 'border-app-input-border text-app-text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {targetingMode === 'provider_segment' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-app-text-label mb-1">
                  Provider Segment
                </label>
                <select
                  aria-label="Provider Segment"
                  value={formData.segmentId || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      segmentId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
                >
                  <option value="">Choose segment</option>
                  {segments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.name} ({segment.memberCount.toLocaleString()} members)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetingMode === 'saved_audience' && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">
                    Saved Audience
                  </label>
                  <select
                    aria-label="Saved Audience"
                    value={formData.includeAudienceId || ''}
                    onChange={(e) => {
                      const nextAudienceId = e.target.value || undefined;
                      const nextAudience = savedAudiencesForList.find(
                        (audience) => audience.id === nextAudienceId
                      );
                      setFormData((prev) => ({
                        ...prev,
                        includeAudienceId: nextAudienceId,
                        exclusionAudienceIds: (prev.exclusionAudienceIds || []).filter(
                          (id) => id !== nextAudienceId
                        ),
                        suppressionSnapshot: (prev.suppressionSnapshot || []).filter(
                          (snapshot) =>
                            !(
                              typeof snapshot === 'object' &&
                              snapshot !== null &&
                              'id' in snapshot &&
                              snapshot.id === nextAudienceId
                            )
                        ),
                        audienceSnapshot: nextAudienceId
                          ? {
                              ...(prev.audienceSnapshot || {}),
                              savedAudienceId: nextAudienceId,
                              savedAudienceName: nextAudience?.name,
                              savedAudienceSourceCount: nextAudience?.sourceCount,
                            }
                          : {},
                      }));
                    }}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
                  >
                    <option value="">Choose saved audience</option>
                    {savedAudiencesForList.map((audience) => (
                      <option key={audience.id} value={audience.id}>
                        {audience.name} ({audience.sourceCount.toLocaleString()} contacts)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">
                    Suppress Saved Audience
                  </label>
                  <select
                    aria-label="Suppress Saved Audience"
                    value={formData.exclusionAudienceIds?.[0] || ''}
                    disabled={!formData.includeAudienceId}
                    onChange={(e) => {
                      const nextExclusionId = e.target.value;
                      const nextExclusion = savedAudiencesForList.find(
                        (audience) => audience.id === nextExclusionId
                      );
                      setFormData((prev) => ({
                        ...prev,
                        exclusionAudienceIds: nextExclusionId ? [nextExclusionId] : [],
                        suppressionSnapshot: nextExclusionId
                          ? [
                              {
                                type: 'saved_audience',
                                id: nextExclusionId,
                                name: nextExclusion?.name,
                                sourceCount: nextExclusion?.sourceCount,
                              },
                            ]
                          : [],
                      }));
                    }}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent disabled:bg-app-surface-muted"
                  >
                    <option value="">No suppression</option>
                    {savedAudiencesForList
                      .filter((audience) => audience.id !== formData.includeAudienceId)
                      .map((audience) => (
                        <option key={audience.id} value={audience.id}>
                          {audience.name}
                        </option>
                      ))}
                  </select>
                </div>
                {selectedIncludeAudience ? (
                  <p className="text-xs text-app-text-muted md:col-span-2">
                    Delivery will sync {selectedIncludeAudience.sourceCount.toLocaleString()}{' '}
                    selected contacts into a run-specific Mailchimp segment.
                  </p>
                ) : null}
              </div>
            )}
            {targetingMode === 'saved_audience' && savedAudiencesForList.length === 0 ? (
              <p className="mt-3 text-xs text-app-text-muted">
                No saved audiences are tied to this provider audience yet.
              </p>
            ) : null}
            {errors.targeting && <p className="mt-2 text-sm text-app-accent">{errors.targeting}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Campaign Title <span className="text-app-accent">*</span>
            </label>
            <input
              aria-label="Campaign Title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
              placeholder="Internal campaign name"
            />
            {errors.title && <p className="mt-1 text-sm text-app-accent">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Subject Line <span className="text-app-accent">*</span>
            </label>
            <input
              aria-label="Subject Line"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
              placeholder="What subscribers will see in their inbox"
            />
            {errors.subject && <p className="mt-1 text-sm text-app-accent">{errors.subject}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Preview Text (Optional)
            </label>
            <input
              aria-label="Preview Text"
              type="text"
              value={formData.previewText}
              onChange={(e) => setFormData((prev) => ({ ...prev, previewText: e.target.value }))}
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
              placeholder="Text displayed after subject in inbox preview"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                From Name <span className="text-app-accent">*</span>
              </label>
              <input
                aria-label="From Name"
                type="text"
                value={formData.fromName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fromName: e.target.value }))}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
                placeholder="Your Organization"
              />
              {errors.fromName && <p className="mt-1 text-sm text-app-accent">{errors.fromName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text-label mb-1">
                Reply-To Email <span className="text-app-accent">*</span>
              </label>
              <input
                aria-label="Reply-To Email"
                type="email"
                value={formData.replyTo}
                onChange={(e) => setFormData((prev) => ({ ...prev, replyTo: e.target.value }))}
                className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
                placeholder="contact@organization.org"
              />
              {errors.replyTo && <p className="mt-1 text-sm text-app-accent">{errors.replyTo}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Compose Message
            </label>
            <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCompositionMode('builder')}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    compositionMode === 'builder'
                      ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'border border-app-input-border text-app-text-muted'
                  }`}
                >
                  Guided Builder
                </button>
                <button
                  type="button"
                  onClick={() => setCompositionMode('html')}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    compositionMode === 'html'
                      ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                      : 'border border-app-input-border text-app-text-muted'
                  }`}
                >
                  Paste HTML
                </button>
              </div>

              <p className="mt-3 text-xs text-app-text-muted">
                Guided Builder creates preview-ready email content without touching website
                templates. Paste HTML keeps the existing raw-provider workflow.
              </p>

              <div className="mt-4">
                {compositionMode === 'builder' ? (
                  <EmailCampaignBuilder
                    value={formData.builderContent || createDefaultEmailBuilderContent()}
                    onChange={(builderContent) => setFormData((prev) => ({ ...prev, builderContent }))}
                  />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-app-text-label mb-1">
                        HTML Content
                      </label>
                      <textarea
                        aria-label="HTML Content"
                        value={formData.htmlContent}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, htmlContent: e.target.value }))
                        }
                        rows={8}
                        className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent font-mono text-sm"
                        placeholder="<h1>Welcome!</h1><p>Your email content here...</p>"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-app-text-label mb-1">
                        Plain Text Content
                      </label>
                      <textarea
                        aria-label="Plain Text Content"
                        value={formData.plainTextContent}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, plainTextContent: e.target.value }))
                        }
                        rows={4}
                        className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
                        placeholder="Plain text version for email clients that don't support HTML"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {errors.content && <p className="mt-1 text-sm text-app-accent">{errors.content}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Schedule Send Time (Optional)
            </label>
            <input
              aria-label="Schedule Send Time"
              type="datetime-local"
              value={formData.sendTime || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, sendTime: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
            />
            {errors.sendTime && <p className="mt-1 text-sm text-app-accent">{errors.sendTime}</p>}
            <p className="mt-1 text-xs text-app-text-muted">Leave empty to save as draft</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text-label mb-1">
              Test Recipients (Optional)
            </label>
            <textarea
              aria-label="Test Recipients"
              value={formData.testRecipients?.join(', ') || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  testRecipients: e.target.value
                    .split(/[\n,]+/)
                    .map((recipient) => recipient.trim())
                    .filter(Boolean),
                }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent"
              placeholder="board@example.org, staff@example.org"
            />
            <p className="mt-1 text-xs text-app-text-muted">
              Stored with the local campaign run snapshot for proof and follow-up.
            </p>
          </div>
        </form>

        <div className="flex justify-between items-center p-6 border-t border-app-border bg-app-surface-muted">
          <button
            type="button"
            onClick={onClose}
            disabled={isCampaignSubmitPending}
            className="px-4 py-2 text-app-text-muted bg-app-surface border border-app-input-border rounded-lg hover:bg-app-surface-muted transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={isCampaignActionPending}
              className="px-4 py-2 text-app-text bg-app-surface border border-app-input-border rounded-lg hover:bg-app-surface-muted transition-colors disabled:opacity-60"
            >
              {isPreviewing ? 'Rendering Preview...' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={isCampaignActionPending}
              className="px-4 py-2 text-app-accent bg-app-accent-soft border border-app-accent rounded-lg hover:bg-app-accent-soft transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitIntent === 'draft_or_schedule' && isCampaignSubmitPending
                ? formData.sendTime
                  ? 'Scheduling...'
                  : 'Saving...'
                : formData.sendTime
                  ? 'Schedule Campaign'
                  : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isCampaignActionPending}
              className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitIntent === 'send_now' && isCampaignSubmitPending ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>
      </div>
      </div>

      {previewResult && (
        <CampaignPreviewModal preview={previewResult} onClose={() => setPreviewResult(null)} />
      )}
    </>
  );
}
