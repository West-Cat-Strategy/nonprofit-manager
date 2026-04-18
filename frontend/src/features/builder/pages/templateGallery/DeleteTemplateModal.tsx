import type { TemplateListItem } from '../../../../types/websiteBuilder';

type DeleteTemplateModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
  template: TemplateListItem | null;
};

export default function DeleteTemplateModal({
  onCancel,
  onConfirm,
  template,
}: DeleteTemplateModalProps) {
  if (!template) {
    return null;
  }

  return (
    <div className="app-popup-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <div className="mx-4 w-full max-w-md rounded-lg bg-app-surface p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-app-text">Delete Template</h2>
        <p className="mb-6 text-app-text-muted">
          Are you sure you want to delete &quot;{template.name}&quot;? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-app-input-border px-4 py-2 text-app-text-muted hover:bg-app-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
