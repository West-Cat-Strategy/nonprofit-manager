import type { ContactFormValues } from '../types';

interface NotesSectionProps {
  formData: ContactFormValues;
  mode: 'create' | 'edit';
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function NotesSection({ formData, mode, onChange }: NotesSectionProps) {
  return (
    <div className="bg-app-surface shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-app-text mb-4">Initial Notes</h2>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-app-text-muted">
          Notes
        </label>
        <textarea
          name="notes"
          id="notes"
          rows={4}
          value={formData.notes ?? ''}
          onChange={onChange}
          placeholder="Add any initial notes about this contact..."
          className="mt-1 block w-full border border-app-input-border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-app-accent focus:border-app-accent sm:text-sm"
        />
        <p className="mt-2 text-sm text-app-text-muted">
          For detailed notes with timestamps, use the Notes section on the contact detail page.
        </p>
      </div>

      {mode === 'edit' && (
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            checked={formData.is_active}
            onChange={onChange}
            className="h-4 w-4 text-app-accent focus:ring-app-accent border-app-input-border rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-app-text">
            Active Contact
          </label>
        </div>
      )}
    </div>
  );
}
