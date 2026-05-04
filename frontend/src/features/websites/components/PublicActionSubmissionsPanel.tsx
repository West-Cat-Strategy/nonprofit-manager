import type {
  WebsitePublicAction,
  WebsitePublicActionSubmission,
  WebsitePublicActionSupportLetterArtifact,
} from '../types';

interface PublicActionSubmissionsPanelProps {
  selectedPublicAction: WebsitePublicAction;
  submissions: WebsitePublicActionSubmission[];
  supportLetterArtifact: WebsitePublicActionSupportLetterArtifact | null;
  supportLetterArtifactLoadingId: string | null;
  supportLetterCopyNotice: string | null;
  onPreviewSupportLetter: (submissionId: string) => void;
  onCopySupportLetter: () => void;
  onDownloadSupportLetter: () => void;
}

export default function PublicActionSubmissionsPanel({
  selectedPublicAction,
  submissions,
  supportLetterArtifact,
  supportLetterArtifactLoadingId,
  supportLetterCopyNotice,
  onPreviewSupportLetter,
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
          submissions.slice(0, 5).map((submission) => (
            <div
              key={submission.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
            >
              <span className="font-medium">{submission.reviewStatus}</span>
              <span>
                {submission.sourceEntityType || 'submission'}{' '}
                {submission.duplicateOfSubmissionId ? 'duplicate' : ''}
              </span>
              <span className="text-xs">
                {new Date(submission.submittedAt).toLocaleString()}
              </span>
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
            </div>
          ))
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
