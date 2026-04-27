import type { ComponentProps } from 'react';
import { CampaignCreateModal as CampaignCreateModalContent } from './CampaignCreateModal';
import type {
  MailchimpList,
  CampaignRun,
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

export function CampaignCreateModal(props: ComponentProps<typeof CampaignCreateModalContent>) {
  return <CampaignCreateModalContent {...props} />;
}
