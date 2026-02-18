import type { SaveStatus } from '../types';

interface SaveBarProps {
  isSaving: boolean;
  saveStatus: SaveStatus;
  isDirty?: boolean;
  lastSavedAt?: Date | null;
  onSave: () => void;
}

export default function SaveBar({
  isSaving,
  saveStatus,
  isDirty = false,
  lastSavedAt = null,
  onSave,
}: SaveBarProps) {
  const persistentStatus = isDirty
    ? 'Unsaved changes'
    : lastSavedAt
      ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : 'No pending changes';

  return (
    <div className="flex items-center justify-between p-6 pt-4 border-t border-app-border">
      <div>
        <p className="text-sm text-app-text-muted">{persistentStatus}</p>
        {saveStatus === 'success' && (
          <span className="text-green-600 text-sm flex items-center">
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Settings saved successfully
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-600 text-sm flex items-center">
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Failed to save settings
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="px-6 py-2 bg-app-accent text-white font-medium rounded-lg hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
