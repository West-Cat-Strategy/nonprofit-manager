import SanitizedPreviewFrame from '../../builder/components/SanitizedPreviewFrame';
import type { MailchimpCampaignPreview } from '../../../types/mailchimp';

interface CampaignPreviewModalProps {
  preview: MailchimpCampaignPreview;
  onClose: () => void;
}

export default function CampaignPreviewModal({
  preview,
  onClose,
}: CampaignPreviewModalProps) {
  return (
    <div className="fixed inset-0 app-popup-backdrop z-50 flex items-center justify-center overflow-y-auto">
      <div className="mx-4 my-8 w-full max-w-6xl rounded-lg border border-app-border bg-app-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-app-border px-6 py-4">
          <div>
            <h3 className="text-xl font-medium text-app-text-heading">Campaign Preview</h3>
            <p className="mt-1 text-sm text-app-text-muted">
              Subject: {preview.subject}
              {preview.previewText ? ` · Inbox preview: ${preview.previewText}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-app-text-subtle hover:text-app-text-muted">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface-muted">
            <SanitizedPreviewFrame
              html={preview.html}
              title="Campaign Preview"
              className="h-[640px] w-full border-0 bg-white"
            />
          </div>

          <div className="space-y-4">
            {preview.warnings.length > 0 && (
              <div className="rounded-lg border border-app-input-border bg-app-surface-muted p-4">
                <h4 className="text-sm font-semibold text-app-text-heading">Preview Warnings</h4>
                <ul className="mt-2 space-y-2 text-sm text-app-text-muted">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-app-border bg-app-surface p-4">
              <h4 className="text-sm font-semibold text-app-text-heading">Plain Text Fallback</h4>
              <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-app-surface-muted p-3 text-sm text-app-text-muted">
                {preview.plainText}
              </pre>
            </div>
          </div>
        </div>

        <div className="border-t border-app-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
