import { useEffect, useState } from 'react';

interface RescheduleFollowUpDialogProps {
  isOpen: boolean;
  followUpTitle?: string;
  initialDate?: string;
  initialTime?: string | null;
  isSaving?: boolean;
  onConfirm: (scheduledDate: string, scheduledTime?: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function RescheduleFollowUpDialog({
  isOpen,
  followUpTitle,
  initialDate,
  initialTime,
  isSaving = false,
  onConfirm,
  onCancel,
}: RescheduleFollowUpDialogProps) {
  const [scheduledDate, setScheduledDate] = useState(initialDate || '');
  const [scheduledTime, setScheduledTime] = useState(initialTime || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setScheduledDate(initialDate || '');
    setScheduledTime(initialTime || '');
    setError(null);
  }, [isOpen, initialDate, initialTime]);

  if (!isOpen) return null;

  return (
<<<<<<< HEAD
    <div className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop p-4" role="dialog" aria-modal="true">
=======
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
>>>>>>> origin/main
      <div className="w-full max-w-md border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[6px_6px_0px_0px_var(--shadow-color)]">
        <h2 className="text-lg font-black">Reschedule Follow-up</h2>
        {followUpTitle && <p className="mt-1 text-sm text-[var(--app-text-muted)]">{followUpTitle}</p>}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col text-sm font-bold">
            Date
            <input
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm font-bold">
            Time (optional)
            <input
              type="time"
              value={scheduledTime}
              onChange={(event) => setScheduledTime(event.target.value)}
              className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 border-2 border-app-accent bg-app-accent-soft px-3 py-2 text-sm font-bold text-app-accent-text">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border-2 border-[var(--app-border)] px-4 py-2 text-sm font-bold"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!scheduledDate) {
                setError('Scheduled date is required.');
                return;
              }
              setError(null);
              await onConfirm(scheduledDate, scheduledTime || undefined);
            }}
            className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] px-4 py-2 text-sm font-bold"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
