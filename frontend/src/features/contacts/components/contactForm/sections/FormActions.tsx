interface FormActionsProps {
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  onCancel: () => void;
}

export default function FormActions({ isSubmitting, mode, onCancel }: FormActionsProps) {
  return (
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onCancel}
        className="bg-app-surface py-2 px-4 border border-app-input-border rounded-md shadow-sm text-sm font-medium text-app-text-muted hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-app-accent py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-app-accent disabled:bg-app-text-subtle disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Contact' : 'Update Contact'}
      </button>
    </div>
  );
}
