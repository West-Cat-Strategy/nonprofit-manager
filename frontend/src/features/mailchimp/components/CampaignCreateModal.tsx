import EmailCampaignBuilder from '../../builder/components/EmailCampaignBuilder';
import { createDefaultEmailBuilderContent } from '../../builder/components/emailCampaignBuilderDefaults';
import CampaignPreviewModal from './CampaignPreviewModal';
import {
  type CampaignCreateModalProps,
  type TargetingMode,
  useCampaignCreateModalForm,
} from './useCampaignCreateModalForm';

export function CampaignCreateModal({
  lists,
  segments,
  savedAudiences,
  campaignRuns,
  provider,
  isDeliveryReady,
  deliveryReadinessMessage,
  isCreatingCampaign,
  isSendingCampaign,
  isTestingCampaign,
  onClose,
  onListChange,
  onPreview,
  onTestSend,
  onSubmit,
}: CampaignCreateModalProps) {
  const {
    cleanedTestRecipients,
    closeButtonRef,
    compositionMode,
    dialogTitleId,
    errors,
    formData,
    handlePreview,
    handleSubmit,
    handleTestSend,
    isCampaignActionPending,
    isCampaignSubmitPending,
    isLocalDeliveryBlocked,
    isPreviewing,
    localDeliveryBlockedMessage,
    preflightAudienceLabel,
    previewResult,
    savedAudiencesForList,
    selectedExclusionAudiences,
    selectedIncludeAudience,
    selectedList,
    setCompositionMode,
    setFormData,
    setPreviewResult,
    setTargetingMode,
    submitIntent,
    suppressiblePriorRuns,
    targetingMode,
    testSendResult,
  } = useCampaignCreateModalForm({
    lists,
    segments,
    savedAudiences,
    campaignRuns,
    provider,
    isDeliveryReady,
    deliveryReadinessMessage,
    isCreatingCampaign,
    isSendingCampaign,
    isTestingCampaign,
    onClose,
    onListChange,
    onPreview,
    onTestSend,
    onSubmit,
  });

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
                  {list.name} ({list.memberCount.toLocaleString()}{' '}
                  {provider === 'local_email' || list.provider === 'local_email'
                    ? 'eligible contacts'
                    : 'subscribers'}
                  )
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
                ['all', provider === 'local_email' ? 'All eligible contacts' : 'All subscribers'],
                ...(provider === 'mailchimp'
                  ? ([['provider_segment', 'Provider segment']] as [string, string][])
                  : []),
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
                    Delivery will queue {selectedIncludeAudience.sourceCount.toLocaleString()}{' '}
                    selected CRM contact{selectedIncludeAudience.sourceCount === 1 ? '' : 's'}
                    {provider === 'mailchimp' ? ' into a run-specific Mailchimp segment.' : '.'}
                  </p>
                ) : null}
              </div>
            )}
            {targetingMode === 'saved_audience' && savedAudiencesForList.length === 0 ? (
              <p className="mt-3 text-xs text-app-text-muted">
                No saved CRM audiences are tied to this delivery audience yet.
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
              Use Send Test Email for delivered provider proof before saving or sending.
            </p>
            {errors.testRecipients && (
              <p className="mt-1 text-sm text-app-accent">{errors.testRecipients}</p>
            )}
            {testSendResult ? (
              <p className="mt-1 text-xs text-app-accent-text">
                Test email {testSendResult.delivered ? 'sent' : 'requested'} for{' '}
                {testSendResult.recipients.join(', ')}.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface-muted p-4">
            <h4 className="text-sm font-medium text-app-text-heading">Preflight Review</h4>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
              <dt className="text-app-text-subtle">Delivery audience</dt>
                <dd className="font-medium text-app-text">{selectedList?.name || 'Not selected'}</dd>
              </div>
              <div>
                <dt className="text-app-text-subtle">Targeting</dt>
                <dd className="font-medium text-app-text">{preflightAudienceLabel}</dd>
              </div>
              <div>
                <dt className="text-app-text-subtle">Suppressions</dt>
                <dd className="font-medium text-app-text">
                  {selectedExclusionAudiences.length + (formData.priorRunSuppressionIds?.length || 0)}
                </dd>
              </div>
              <div>
                <dt className="text-app-text-subtle">Delivery readiness</dt>
                <dd className="font-medium text-app-text">
                  {provider === 'local_email'
                    ? isDeliveryReady
                      ? 'SMTP ready'
                      : 'SMTP setup required'
                    : 'Provider ready'}
                </dd>
              </div>
              <div>
                <dt className="text-app-text-subtle">Test recipients</dt>
                <dd className="font-medium text-app-text">
                  {cleanedTestRecipients.length > 0 ? cleanedTestRecipients.join(', ') : 'None'}
                </dd>
              </div>
            </dl>
            {isLocalDeliveryBlocked ? (
              <p className="mt-3 text-xs text-app-accent">
                {localDeliveryBlockedMessage} Preview and draft saving remain available.
              </p>
            ) : null}
            {errors.delivery ? (
              <p className="mt-2 text-sm text-app-accent">{errors.delivery}</p>
            ) : null}
            {selectedIncludeAudience ? (
              <p className="mt-3 text-xs text-app-text-muted">
                Saved-audience count proof: {selectedIncludeAudience.sourceCount.toLocaleString()}{' '}
                CRM contact{selectedIncludeAudience.sourceCount === 1 ? '' : 's'} before suppression.
              </p>
            ) : null}
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
              onClick={handleTestSend}
              disabled={isCampaignActionPending || isLocalDeliveryBlocked}
              title={isLocalDeliveryBlocked ? localDeliveryBlockedMessage : undefined}
              className="px-4 py-2 text-app-text bg-app-surface border border-app-input-border rounded-lg hover:bg-app-surface-muted transition-colors disabled:opacity-60"
            >
              {isTestingCampaign ? 'Sending Test...' : 'Send Test Email'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={
                isCampaignActionPending || (Boolean(formData.sendTime) && isLocalDeliveryBlocked)
              }
              title={
                Boolean(formData.sendTime) && isLocalDeliveryBlocked
                  ? localDeliveryBlockedMessage
                  : undefined
              }
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
              disabled={isCampaignActionPending || isLocalDeliveryBlocked}
              title={isLocalDeliveryBlocked ? localDeliveryBlockedMessage : undefined}
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
