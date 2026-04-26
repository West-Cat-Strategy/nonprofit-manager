import { useEffect, useId, useMemo, useRef, useState } from 'react';
import EmailCampaignBuilder from '../../builder/components/EmailCampaignBuilder';
import { createDefaultEmailBuilderContent } from '../../builder/components/emailCampaignBuilderDefaults';
import CampaignPreviewModal from './CampaignPreviewModal';
import type {
  MailchimpList,
  MailchimpSegment,
  SavedAudience,
  CampaignRun,
  CreateCampaignRequest,
  MailchimpCampaignPreview,
} from '../../../types/mailchimp';

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
  campaignRuns,
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
  campaignRuns: CampaignRun[];
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
    priorRunSuppressionIds: [],
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
  const suppressiblePriorRuns = useMemo(
    () =>
      campaignRuns.filter(
        (run) =>
          run.listId === formData.listId &&
          Array.isArray(run.audienceSnapshot.targetContactIds) &&
          run.audienceSnapshot.targetContactIds.length > 0
      ),
    [campaignRuns, formData.listId]
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
                  priorRunSuppressionIds: [],
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
                      priorRunSuppressionIds:
                        nextMode === 'saved_audience' ? prev.priorRunSuppressionIds : [],
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
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">
                    Suppress Prior Runs
                  </label>
                  <select
                    multiple
                    aria-label="Suppress Prior Campaign Runs"
                    value={formData.priorRunSuppressionIds || []}
                    disabled={!formData.includeAudienceId || suppressiblePriorRuns.length === 0}
                    onChange={(e) => {
                      const selectedRunIds = Array.from(e.target.selectedOptions).map(
                        (option) => option.value
                      );
                      setFormData((prev) => ({
                        ...prev,
                        priorRunSuppressionIds: selectedRunIds,
                      }));
                    }}
                    className="h-[42px] w-full px-3 py-2 border border-app-input-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent disabled:bg-app-surface-muted"
                  >
                    {suppressiblePriorRuns.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.title}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedIncludeAudience ? (
                  <p className="text-xs text-app-text-muted md:col-span-3">
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
