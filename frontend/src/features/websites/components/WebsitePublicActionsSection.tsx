import React, { useEffect, useMemo, useState } from 'react';
import { websitesApiClient } from '../api/websitesApiClient';
import type {
  WebsitePublicAction,
  WebsitePublicActionSubmission,
  WebsitePublicActionSupportLetterArtifact,
} from '../types';
import type {
  PublicActionReviewStatus,
  PublicActionStatus,
  PublicActionType,
} from '../../../types/websiteBuilder';
import PublicActionSubmissionsPanel from './PublicActionSubmissionsPanel';
import WebsiteConsoleStatePanel from './WebsiteConsoleStatePanel';

type WebsiteFormsNotice = {
  tone: 'success' | 'error';
  message: string;
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

const reviewableSelfReferralSubmissionStatuses = new Set<PublicActionReviewStatus>([
  'new',
  'needs_review',
  'duplicate',
]);

const emptyPublicActionDraft = {
  actionType: 'petition_signature' as PublicActionType,
  status: 'draft' as PublicActionStatus,
  title: '',
  slug: '',
  description: '',
};

const formatReviewStatus = (status: PublicActionReviewStatus): string =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatActionStatus = (status: PublicActionStatus): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

const formatSubmittedAt = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const getSubmissionPayloadValue = (
  submission: WebsitePublicActionSubmission,
  key: string
): string | null => {
  const value = submission.payloadRedacted[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const getSelfReferralSubmissionLabel = (submission: WebsitePublicActionSubmission): string => {
  const firstName = getSubmissionPayloadValue(submission, 'first_name');
  const lastName = getSubmissionPayloadValue(submission, 'last_name');
  const email = getSubmissionPayloadValue(submission, 'email');
  const name = [firstName, lastName].filter(Boolean).join(' ');

  return name || email || submission.contactId || submission.id;
};

type WebsitePublicActionsSectionProps = {
  siteId: string;
  onNotice: (notice: WebsiteFormsNotice) => void;
};

const WebsitePublicActionsSection: React.FC<WebsitePublicActionsSectionProps> = ({
  siteId,
  onNotice,
}) => {
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
  const [submissionTransitionLoadingId, setSubmissionTransitionLoadingId] = useState<
    string | null
  >(null);
  const [supportLetterCopyNotice, setSupportLetterCopyNotice] = useState<string | null>(null);

  useEffect(() => {
    setIsActionLoading(true);
    websitesApiClient
      .listPublicActions(siteId)
      .then((actions) => {
        setPublicActions(actions);
        setSelectedPublicActionId((current) => current ?? actions[0]?.id ?? null);
      })
      .catch(() => {
        onNotice({
          tone: 'error',
          message: 'Failed to load public actions.',
        });
      })
      .finally(() => setIsActionLoading(false));
  }, [onNotice, siteId]);

  const selectedPublicAction = useMemo(
    () => publicActions.find((action) => action.id === selectedPublicActionId) ?? null,
    [publicActions, selectedPublicActionId]
  );

  const selectedSelfReferralSnapshotSubmissions = useMemo(() => {
    if (selectedPublicAction?.actionType !== 'self_referral') {
      return [];
    }

    const selectedSubmissions = publicActionSubmissions.filter(
      (submission) =>
        submission.actionId === selectedPublicAction.id &&
        submission.actionType === 'self_referral'
    );
    const reviewableSubmissions = selectedSubmissions.filter((submission) =>
      reviewableSelfReferralSubmissionStatuses.has(submission.reviewStatus)
    );

    return (reviewableSubmissions.length > 0 ? reviewableSubmissions : selectedSubmissions).slice(
      0,
      3
    );
  }, [publicActionSubmissions, selectedPublicAction]);

  const selfReferralSnapshot = useMemo(() => {
    const selfReferralActions = publicActions.filter(
      (action) => action.actionType === 'self_referral'
    );
    const openActions = selfReferralActions.filter((action) => action.status === 'published');
    const inactiveActions = selfReferralActions.filter((action) => action.status !== 'published');
    const recordedSubmissions = selfReferralActions.reduce(
      (total, action) => total + action.submissionCount,
      0
    );
    const drilldown = [...selfReferralActions]
      .sort((left, right) => {
        if (right.submissionCount !== left.submissionCount) {
          return right.submissionCount - left.submissionCount;
        }
        if (left.status === right.status) {
          return left.title.localeCompare(right.title);
        }
        return left.status === 'published' ? -1 : 1;
      })
      .slice(0, 3);
    const status =
      selfReferralActions.length === 0
        ? {
            label: 'Setup needed',
            detail: 'Create a self-referral action before sharing a public intake route.',
          }
        : openActions.length === 0
          ? {
              label: 'Not live',
              detail: 'Publish one self-referral action before sharing the public intake link.',
            }
          : recordedSubmissions > 0
            ? {
                label: 'Review queue active',
                detail: `${pluralize(
                  recordedSubmissions,
                  'recorded submission'
                )} across ${pluralize(openActions.length, 'open action')}.`,
              }
            : {
                label: 'Live, no submissions yet',
                detail: 'Published self-referral actions are live and waiting for intake requests.',
              };

    return {
      openActions,
      inactiveActions,
      recordedSubmissions,
      drilldown,
      status,
    };
  }, [publicActions]);

  useEffect(() => {
    if (!selectedPublicActionId) {
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

  const createPublicAction = async () => {
    if (!publicActionDraft.title.trim()) return;
    setIsActionLoading(true);
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
      onNotice({ tone: 'success', message: 'Public action created.' });
    } catch {
      onNotice({ tone: 'error', message: 'Failed to create public action.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const updatePublicActionStatus = async (
    action: WebsitePublicAction,
    status: PublicActionStatus
  ) => {
    setIsActionLoading(true);
    try {
      const updated = await websitesApiClient.updatePublicAction(siteId, action.id, { status });
      setPublicActions((current) =>
        current.map((currentAction) => (currentAction.id === updated.id ? updated : currentAction))
      );
      onNotice({ tone: 'success', message: 'Public action status updated.' });
    } catch {
      onNotice({ tone: 'error', message: 'Failed to update public action.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const transitionPublicActionSubmission = async (
    submissionId: string,
    transition: 'accept' | 'reject' | 'fulfill'
  ) => {
    if (!selectedPublicActionId) return;

    setSubmissionTransitionLoadingId(submissionId);
    try {
      const result =
        transition === 'accept'
          ? await websitesApiClient.acceptPublicActionSubmission(
              siteId,
              selectedPublicActionId,
              submissionId
            )
          : transition === 'reject'
            ? await websitesApiClient.rejectPublicActionSubmission(
                siteId,
                selectedPublicActionId,
                submissionId
              )
            : await websitesApiClient.fulfillPublicActionSubmission(
                siteId,
                selectedPublicActionId,
                submissionId
              );

      setPublicActionSubmissions((current) =>
        current.map((submission) =>
          submission.id === result.submission.id ? result.submission : submission
        )
      );

      if (supportLetterArtifact?.submissionId === result.submission.id) {
        setSupportLetterArtifact(null);
        setSupportLetterCopyNotice(null);
      }

      onNotice({
        tone: 'success',
        message: `Submission ${transition === 'fulfill' ? 'fulfilled' : `${transition}ed`}.`,
      });
    } catch {
      onNotice({ tone: 'error', message: 'Failed to update submission review status.' });
    } finally {
      setSubmissionTransitionLoadingId(null);
    }
  };

  const previewSupportLetterArtifact = async (submissionId: string) => {
    if (!selectedPublicActionId) return;
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
      onNotice({ tone: 'error', message: 'Failed to load support letter artifact.' });
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

  return (
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

      <div
        className="mt-5 rounded-2xl border border-app-border bg-app-surface-muted p-4"
        role="region"
        aria-labelledby="self-referral-status-heading"
      >
        <div>
          <div>
            <div id="self-referral-status-heading" className="text-xs uppercase">
              Self-referral status
            </div>
            <div className="mt-2 text-sm font-semibold text-app-text">
              {selfReferralSnapshot.status.label}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-app-text-muted">
              {selfReferralSnapshot.status.detail}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-2xl font-semibold">
              {selfReferralSnapshot.openActions.length} open
            </div>
            <div>accepting referrals</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">
              {selfReferralSnapshot.inactiveActions.length} draft/closed
            </div>
            <div>not accepting yet</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">
              {selfReferralSnapshot.recordedSubmissions}
            </div>
            <div>recorded submissions</div>
          </div>
        </div>
        {selfReferralSnapshot.drilldown.length > 0 ? (
          <div className="mt-4 divide-y divide-app-border text-sm">
            {selfReferralSnapshot.drilldown.map((action) => (
              <div
                key={action.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-app-text">{action.title}</div>
                  <div className="mt-1 text-xs text-app-text-muted">
                    {formatActionStatus(action.status)} • /{action.slug} •{' '}
                    {pluralize(action.submissionCount, 'submission')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPublicActionId(action.id)}
                  className="self-start rounded-full border border-app-border bg-app-surface px-3 py-1 text-xs font-medium text-app-text-muted transition-colors hover:text-app-text sm:self-center"
                >
                  Review {action.title}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-app-text-muted">
            No self-referral action is available to review in this site yet.
          </p>
        )}
        {selectedPublicAction?.actionType === 'self_referral' ? (
          <div className="mt-4 border-t border-app-border pt-4">
            <div className="text-xs uppercase text-app-text-muted">
              {selectedSelfReferralSnapshotSubmissions.some((submission) =>
                reviewableSelfReferralSubmissionStatuses.has(submission.reviewStatus)
              )
                ? 'Recent reviewable self-referrals'
                : 'Recent self-referrals'}
            </div>
            {selectedSelfReferralSnapshotSubmissions.length > 0 ? (
              <div className="mt-3 space-y-2 text-sm">
                {selectedSelfReferralSnapshotSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex flex-col gap-1 rounded-xl bg-app-surface px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-app-text">
                        {getSelfReferralSubmissionLabel(submission)}
                      </div>
                      <div className="text-xs text-app-text-muted">
                        {formatReviewStatus(submission.reviewStatus)} •{' '}
                        {submission.pagePath || 'No page path'} •{' '}
                        {formatSubmittedAt(submission.submittedAt)}
                      </div>
                    </div>
                    <span className="text-xs text-app-text-muted">
                      {submission.sourceEntityType || 'submission'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-app-text-muted">
                No new self-referral submissions need review for the selected action.
              </p>
            )}
          </div>
        ) : selfReferralSnapshot.drilldown.length > 0 ? (
          <p className="mt-4 border-t border-app-border pt-4 text-sm text-app-text-muted">
            Select a self-referral action above to inspect its review statuses here.
          </p>
        ) : null}
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
              submissionTransitionLoadingId={submissionTransitionLoadingId}
              supportLetterCopyNotice={supportLetterCopyNotice}
              onPreviewSupportLetter={(submissionId) => void previewSupportLetterArtifact(submissionId)}
              onAcceptSubmission={(submissionId) =>
                void transitionPublicActionSubmission(submissionId, 'accept')
              }
              onRejectSubmission={(submissionId) =>
                void transitionPublicActionSubmission(submissionId, 'reject')
              }
              onFulfillSubmission={(submissionId) =>
                void transitionPublicActionSubmission(submissionId, 'fulfill')
              }
              onCopySupportLetter={() => void copySupportLetterArtifact()}
              onDownloadSupportLetter={downloadSupportLetterArtifact}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default WebsitePublicActionsSection;
