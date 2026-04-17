import { staffEventsPrimaryActionClassName, staffEventsSecondaryActionClassName } from '../../components/StaffEventsPageShell';

interface EventEditorFooterProps {
  isEdit: boolean;
  loading: boolean;
  retryingReminderSync: boolean;
  onCancel: () => void;
}

export function EventEditorFooter({
  isEdit,
  loading,
  retryingReminderSync,
  onCancel,
}: EventEditorFooterProps) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-app-text-muted">
          Required fields are marked with an asterisk. Saving keeps the existing event and reminder contracts intact.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={staffEventsSecondaryActionClassName}
            disabled={loading || retryingReminderSync}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={staffEventsPrimaryActionClassName}
            disabled={loading || retryingReminderSync}
          >
            {loading ? 'Saving...' : isEdit ? 'Update event' : 'Create event'}
          </button>
        </div>
      </div>
    </section>
  );
}
