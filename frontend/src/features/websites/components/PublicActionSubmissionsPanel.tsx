import type {
  WebsitePublicAction,
  WebsitePublicActionSubmission,
  WebsitePublicActionSupportLetterArtifact,
} from '../types';

const reviewOutcomeLabels: Record<string, string> = {
  new: 'Awaiting review',
  needs_review: 'Needs review',
  duplicate: 'Marked duplicate',
  accepted: 'Accepted',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled',
};

const artifactLabels: Record<string, string> = {
  templateVersion: 'Template',
  letterTitle: 'Letter title',
  generatedAt: 'Generated',
  contactId: 'Contact',
  sourceEntityId: 'Record',
  sourceEntityType: 'Record type',
};

const formatStatusLabel = (status: string): string =>
  reviewOutcomeLabels[status] ?? status.replace(/_/g, ' ');

const formatDateTime = (value?: string | null): string =>
  value ? new Date(value).toLocaleString() : 'Not recorded';

const formatKeyLabel = (key: string): string =>
  artifactLabels[key] ??
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatArtifactValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return 'Not recorded';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatArtifactValue).join(', ');
  }
  return JSON.stringify(value);
};

const getGeneratedArtifactRows = (
  generatedArtifact: Record<string, unknown>
): Array<[string, string]> =>
  Object.entries(generatedArtifact)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 4)
    .map(([key, value]) => [formatKeyLabel(key), formatArtifactValue(value)]);

interface PublicActionSubmissionsPanelProps {
  selectedPublicAction: WebsitePublicAction;
  submissions: WebsitePublicActionSubmission[];
  supportLetterArtifact: WebsitePublicActionSupportLetterArtifact | null;
  supportLetterArtifactLoadingId: string | null;
  submissionTransitionLoadingId: string | null;
  supportLetterCopyNotice: string | null;
  onPreviewSupportLetter: (submissionId: string) => void;
  onAcceptSubmission: (submissionId: string) => void;
  onRejectSubmission: (submissionId: string) => void;
  onFulfillSubmission: (submissionId: string) => void;
  onCopySupportLetter: () => void;
  onDownloadSupportLetter: () => void;
}

export default function PublicActionSubmissionsPanel({
  selectedPublicAction,
  submissions,
  supportLetterArtifact,
  supportLetterArtifactLoadingId,
  submissionTransitionLoadingId,
  supportLetterCopyNotice,
  onPreviewSupportLetter,
  onAcceptSubmission,
  onRejectSubmission,
  onFulfillSubmission,
  onCopySupportLetter,
  onDownloadSupportLetter,
}: PublicActionSubmissionsPanelProps) {
  const isSupportLetterAction = selectedPublicAction.actionType === 'support_letter_request';

  return (
    <div className="rounded-2xl border p-4">
      <h3 className="text-sm font-semibold">
        Recent submissions for {selectedPublicAction.title}
      </h3>
      <div className="mt-3 space-y-2">
        {submissions.length === 0 ? (
          <p className="text-sm">
            No submissions have been recorded for this action yet.
          </p>
        ) : (
          submissions.slice(0, 5).map((submission) => {
            const generatedArtifactRows = getGeneratedArtifactRows(submission.generatedArtifact);
            const hasLinkedRecord = Boolean(
              submission.contactId ||
                submission.sourceEntityId ||
                submission.duplicateOfSubmissionId ||
                generatedArtifactRows.length > 0
            );

            return (
              <article
                key={submission.id}
                className="rounded-xl border border-app-border bg-app-surface-muted px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{formatStatusLabel(submission.reviewStatus)}</p>
                    <p className="text-xs text-app-text-muted">
                      {submission.sourceEntityType || 'submission'}
                      {submission.duplicateOfSubmissionId ? ' duplicate' : ''} •{' '}
                      {submission.pagePath || 'No page path'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isSupportLetterAction ? (
                      <button
                        type="button"
                        onClick={() => onPreviewSupportLetter(submission.id)}
                        disabled={supportLetterArtifactLoadingId === submission.id}
                        className="rounded-full border px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {supportLetterArtifactLoadingId === submission.id
                          ? 'Loading letter'
                          : 'Preview letter'}
                      </button>
                    ) : null}
                    {submission.reviewStatus === 'new' ||
                    submission.reviewStatus === 'needs_review' ||
                    submission.reviewStatus === 'duplicate' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onAcceptSubmission(submission.id)}
                          disabled={submissionTransitionLoadingId === submission.id}
                          className="rounded-full border px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectSubmission(submission.id)}
                          disabled={submissionTransitionLoadingId === submission.id}
                          className="rounded-full border px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {submission.reviewStatus === 'new' ||
                    submission.reviewStatus === 'needs_review' ||
                    submission.reviewStatus === 'duplicate' ||
                    submission.reviewStatus === 'accepted' ? (
                      <button
                        type="button"
                        onClick={() => onFulfillSubmission(submission.id)}
                        disabled={submissionTransitionLoadingId === submission.id}
                        className="rounded-full border px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Fulfill
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <section aria-label={`Review history for ${submission.id}`}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                      Review history
                    </h4>
                    <dl className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-app-text-muted">Submitted</dt>
                        <dd className="text-right">{formatDateTime(submission.submittedAt)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-app-text-muted">{formatStatusLabel(submission.reviewStatus)}</dt>
                        <dd className="text-right">{formatDateTime(submission.updatedAt)}</dd>
                      </div>
                    </dl>
                  </section>

                  <section aria-label={`Artifacts for ${submission.id}`}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                      Artifacts
                    </h4>
                    {hasLinkedRecord ? (
                      <dl className="mt-2 space-y-1 text-xs">
                        {submission.contactId ? (
                          <div className="flex justify-between gap-3">
                            <dt className="text-app-text-muted">Contact</dt>
                            <dd className="truncate text-right">{submission.contactId}</dd>
                          </div>
                        ) : null}
                        {submission.sourceEntityId ? (
                          <div className="flex justify-between gap-3">
                            <dt className="text-app-text-muted">
                              {formatKeyLabel(submission.sourceEntityType || 'record')}
                            </dt>
                            <dd className="truncate text-right">{submission.sourceEntityId}</dd>
                          </div>
                        ) : null}
                        {submission.duplicateOfSubmissionId ? (
                          <div className="flex justify-between gap-3">
                            <dt className="text-app-text-muted">Duplicate of</dt>
                            <dd className="truncate text-right">{submission.duplicateOfSubmissionId}</dd>
                          </div>
                        ) : null}
                        {generatedArtifactRows.map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3">
                            <dt className="text-app-text-muted">{label}</dt>
                            <dd className="truncate text-right">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-2 text-xs text-app-text-muted">
                        No linked artifact has been generated yet.
                      </p>
                    )}
                  </section>
                </div>
              </article>
            );
          })
        )}
      </div>
      {isSupportLetterAction && supportLetterArtifact ? (
        <div className="mt-4 rounded-2xl border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-sm font-semibold">
                {supportLetterArtifact.letterTitle}
              </h4>
              <p className="mt-1 text-xs">
                {supportLetterArtifact.approvalStatus} • template{' '}
                {supportLetterArtifact.templateVersion}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCopySupportLetter}
                className="rounded-full border px-3 py-1 text-xs font-medium"
              >
                Copy letter
              </button>
              <button
                type="button"
                onClick={onDownloadSupportLetter}
                className="rounded-full border px-3 py-1 text-xs font-medium"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border p-3 text-sm">
            {supportLetterArtifact.letterBody}
          </pre>
          {supportLetterCopyNotice ? (
            <p className="mt-2 text-xs">{supportLetterCopyNotice}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
