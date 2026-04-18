type NewTemplateModalProps = {
  onBrowseStarterTemplates: () => void;
  onClose: () => void;
  onStartFromScratch: () => void | Promise<void>;
  open: boolean;
};

export default function NewTemplateModal({
  onBrowseStarterTemplates,
  onClose,
  onStartFromScratch,
  open,
}: NewTemplateModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="app-popup-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <div className="mx-4 w-full max-w-md rounded-lg bg-app-surface p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-app-text">Create New Website</h2>
        <p className="mb-6 text-app-text-muted">Choose how you&apos;d like to start:</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={onBrowseStarterTemplates}
            className="w-full rounded-lg border border-app-border p-4 text-left transition-colors hover:border-app-accent hover:bg-app-accent-soft"
          >
            <div className="font-medium text-app-text">Start from a Template</div>
            <div className="text-sm text-app-text-muted">
              Choose from our collection of professional templates
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              void onStartFromScratch();
            }}
            className="w-full rounded-lg border border-app-border p-4 text-left transition-colors hover:border-app-accent hover:bg-app-accent-soft"
          >
            <div className="font-medium text-app-text">Start from Scratch</div>
            <div className="text-sm text-app-text-muted">
              Begin with a blank template and build your own design
            </div>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-app-text-muted hover:text-app-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
